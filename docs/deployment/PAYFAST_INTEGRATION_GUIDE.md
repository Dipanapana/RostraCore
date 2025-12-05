# PayFast Subscription Integration Guide
## RostraCore SaaS Payment System

---

## 🎯 **OVERVIEW**

PayFast subscription integration for RostraCore's **R497/site/month** pricing model.

**Your Business Account:** ✅ Already set up
**Payment Type:** Recurring subscriptions (ad hoc)
**Currency:** ZAR (South African Rand)

---

## 💰 **PRICING MODEL**

From your landing page:

```
R497 per site per month
+ Setup once: R2,500 (one-time)
```

**Example calculations:**
- **1 site:** R497/month (+ R2,500 setup)
- **5 sites:** R2,485/month (+ R2,500 setup)
- **10 sites:** R4,970/month (+ R2,500 setup)

---

## 📋 **INTEGRATION PLAN**

### **Phase 1: Setup (Backend)**
1. Install PayFast SDK
2. Create subscription models
3. Create payment endpoints
4. Add webhook handler
5. Add subscription status checking

### **Phase 2: Frontend**
1. Subscription management page
2. Payment form
3. Success/failure pages
4. Billing history

### **Phase 3: Business Logic**
1. Trial period (optional 14 days)
2. Grace period for failed payments
3. Feature gating based on subscription status
4. Invoice generation

---

## 🔧 **IMPLEMENTATION**

### **STEP 1: Install Dependencies**

```bash
cd backend
source venv/bin/activate
pip install payfast-python requests
```

Add to `requirements.txt`:
```
payfast-python==1.0.0
requests==2.31.0
```

---

### **STEP 2: Configure PayFast Credentials**

Add to `backend/.env`:
```bash
# PayFast Configuration
PAYFAST_MERCHANT_ID=your_merchant_id_here
PAYFAST_MERCHANT_KEY=your_merchant_key_here
PAYFAST_PASSPHRASE=your_passphrase_here
PAYFAST_MODE=sandbox  # Change to 'production' when live

# Subscription Settings
PAYFAST_RETURN_URL=https://yourdomain.com/payment/success
PAYFAST_CANCEL_URL=https://yourdomain.com/payment/cancelled
PAYFAST_NOTIFY_URL=https://api.yourdomain.com/api/v1/payments/payfast/webhook

# Pricing
SETUP_FEE=2500  # R2,500 one-time
PRICE_PER_SITE=497  # R497 per site per month
FREE_TRIAL_DAYS=14  # Optional
```

Update `backend/app/config.py`:
```python
# PayFast Settings
PAYFAST_MERCHANT_ID: str
PAYFAST_MERCHANT_KEY: str
PAYFAST_PASSPHRASE: str
PAYFAST_MODE: str = "sandbox"  # "sandbox" or "production"
PAYFAST_RETURN_URL: str
PAYFAST_CANCEL_URL: str
PAYFAST_NOTIFY_URL: str

# Pricing
SETUP_FEE: int = 2500
PRICE_PER_SITE: int = 497
FREE_TRIAL_DAYS: int = 14
```

---

### **STEP 3: Create Database Models**

Create `backend/app/models/subscription.py`:

```python
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class SubscriptionStatus(enum.Enum):
    """Subscription status enum"""
    TRIAL = "trial"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELLED = "cancelled"
    SUSPENDED = "suspended"


class PaymentStatus(enum.Enum):
    """Payment status enum"""
    PENDING = "pending"
    COMPLETE = "complete"
    FAILED = "failed"
    REFUNDED = "refunded"


class Subscription(Base):
    """Organization subscription"""
    __tablename__ = "subscriptions"

    subscription_id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id"), nullable=False, unique=True)

    # PayFast details
    payfast_token = Column(String(100), unique=True)  # Ad hoc subscription token
    payfast_subscription_id = Column(String(100), unique=True)

    # Subscription details
    status = Column(SQLEnum(SubscriptionStatus), default=SubscriptionStatus.TRIAL, nullable=False)
    num_sites = Column(Integer, default=1, nullable=False)
    monthly_amount = Column(Float, nullable=False)  # R497 × num_sites
    setup_fee_paid = Column(Boolean, default=False)

    # Dates
    trial_start = Column(DateTime, nullable=True)
    trial_end = Column(DateTime, nullable=True)
    subscription_start = Column(DateTime, nullable=True)
    next_billing_date = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="subscription")
    payments = relationship("Payment", back_populates="subscription", cascade="all, delete-orphan")


class Payment(Base):
    """Individual payment record"""
    __tablename__ = "payments"

    payment_id = Column(Integer, primary_key=True, autoincrement=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.subscription_id"), nullable=False)

    # PayFast details
    payfast_payment_id = Column(String(100), unique=True)
    payfast_token = Column(String(100))

    # Payment details
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="ZAR")
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)
    is_setup_fee = Column(Boolean, default=False)

    # Dates
    billing_date = Column(DateTime, nullable=False)
    paid_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    subscription = relationship("Subscription", back_populates="payments")
```

Update `backend/app/models/organization.py`:
```python
# Add to Organization model
subscription = relationship("Subscription", back_populates="organization", uselist=False)
```

Create migration:
```bash
cd backend
alembic revision --autogenerate -m "add_subscription_and_payment_models"
alembic upgrade head
```

---

### **STEP 4: Create PayFast Service**

Create `backend/app/services/payfast_service.py`:

```python
"""PayFast integration service"""
import hashlib
import urllib.parse
from typing import Dict, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.config import settings
from app.models.subscription import Subscription, SubscriptionStatus, Payment, PaymentStatus
import requests
import logging

logger = logging.getLogger(__name__)


class PayFastService:
    """PayFast payment integration"""

    SANDBOX_URL = "https://sandbox.payfast.co.za/eng/process"
    PRODUCTION_URL = "https://www.payfast.co.za/eng/process"

    def __init__(self, db: Session):
        self.db = db
        self.merchant_id = settings.PAYFAST_MERCHANT_ID
        self.merchant_key = settings.PAYFAST_MERCHANT_KEY
        self.passphrase = settings.PAYFAST_PASSPHRASE
        self.mode = settings.PAYFAST_MODE

    @property
    def base_url(self) -> str:
        """Get PayFast base URL based on mode"""
        return self.SANDBOX_URL if self.mode == "sandbox" else self.PRODUCTION_URL

    def create_subscription(
        self,
        org_id: int,
        num_sites: int,
        customer_email: str,
        customer_name: str,
        include_setup_fee: bool = True
    ) -> Dict:
        """
        Create PayFast ad hoc subscription

        Args:
            org_id: Organization ID
            num_sites: Number of sites
            customer_email: Customer email
            customer_name: Customer name
            include_setup_fee: Include R2,500 setup fee

        Returns:
            Dict with payment_url and subscription details
        """
        # Calculate amounts
        monthly_amount = settings.PRICE_PER_SITE * num_sites
        initial_amount = monthly_amount + (settings.SETUP_FEE if include_setup_fee else 0)

        # Create or get subscription
        subscription = self.db.query(Subscription).filter(
            Subscription.org_id == org_id
        ).first()

        if not subscription:
            subscription = Subscription(
                org_id=org_id,
                num_sites=num_sites,
                monthly_amount=monthly_amount,
                setup_fee_paid=include_setup_fee,
                status=SubscriptionStatus.TRIAL if settings.FREE_TRIAL_DAYS > 0 else SubscriptionStatus.ACTIVE,
                trial_start=datetime.utcnow() if settings.FREE_TRIAL_DAYS > 0 else None,
                trial_end=datetime.utcnow() + timedelta(days=settings.FREE_TRIAL_DAYS) if settings.FREE_TRIAL_DAYS > 0 else None
            )
            self.db.add(subscription)
            self.db.commit()
            self.db.refresh(subscription)

        # Build PayFast payment data
        payment_data = {
            'merchant_id': self.merchant_id,
            'merchant_key': self.merchant_key,
            'return_url': settings.PAYFAST_RETURN_URL,
            'cancel_url': settings.PAYFAST_CANCEL_URL,
            'notify_url': settings.PAYFAST_NOTIFY_URL,

            # Customer details
            'name_first': customer_name.split()[0] if ' ' in customer_name else customer_name,
            'name_last': customer_name.split()[-1] if ' ' in customer_name else '',
            'email_address': customer_email,

            # Transaction details
            'subscription_type': '1',  # Ad hoc subscription
            'amount': f'{initial_amount:.2f}',
            'item_name': f'RostraCore - {num_sites} Site{"s" if num_sites != 1 else ""}',
            'item_description': f'Monthly subscription for {num_sites} site{"s" if num_sites != 1 else ""}',

            # Custom fields
            'custom_int1': str(org_id),
            'custom_int2': str(subscription.subscription_id),
            'custom_str1': 'setup_fee' if include_setup_fee else 'monthly',
        }

        # Generate signature
        payment_data['signature'] = self._generate_signature(payment_data)

        # Build payment URL
        payment_url = f"{self.base_url}?{urllib.parse.urlencode(payment_data)}"

        return {
            'payment_url': payment_url,
            'subscription_id': subscription.subscription_id,
            'amount': initial_amount,
            'monthly_amount': monthly_amount,
            'setup_fee': settings.SETUP_FEE if include_setup_fee else 0,
            'status': subscription.status.value
        }

    def update_subscription_sites(self, subscription_id: int, new_num_sites: int) -> Dict:
        """Update number of sites in subscription"""
        subscription = self.db.query(Subscription).filter(
            Subscription.subscription_id == subscription_id
        ).first()

        if not subscription:
            raise ValueError("Subscription not found")

        old_amount = subscription.monthly_amount
        new_amount = settings.PRICE_PER_SITE * new_num_sites

        subscription.num_sites = new_num_sites
        subscription.monthly_amount = new_amount
        subscription.updated_at = datetime.utcnow()

        self.db.commit()

        return {
            'subscription_id': subscription_id,
            'old_amount': old_amount,
            'new_amount': new_amount,
            'num_sites': new_num_sites,
            'message': 'Subscription updated. New amount will apply on next billing date.'
        }

    def cancel_subscription(self, subscription_id: int) -> Dict:
        """Cancel subscription"""
        subscription = self.db.query(Subscription).filter(
            Subscription.subscription_id == subscription_id
        ).first()

        if not subscription:
            raise ValueError("Subscription not found")

        subscription.status = SubscriptionStatus.CANCELLED
        subscription.cancelled_at = datetime.utcnow()
        subscription.updated_at = datetime.utcnow()

        self.db.commit()

        # TODO: Call PayFast API to cancel subscription
        # This requires PayFast API credentials and endpoint

        return {
            'subscription_id': subscription_id,
            'status': 'cancelled',
            'cancelled_at': subscription.cancelled_at.isoformat()
        }

    def handle_webhook(self, data: Dict) -> Dict:
        """
        Handle PayFast ITN (Instant Transaction Notification) webhook

        Args:
            data: POST data from PayFast

        Returns:
            Dict with processing result
        """
        logger.info(f"PayFast webhook received: {data}")

        # Verify signature
        if not self._verify_signature(data):
            logger.error("Invalid PayFast signature")
            return {'status': 'error', 'message': 'Invalid signature'}

        # Verify payment with PayFast
        if not self._verify_payment_with_payfast(data):
            logger.error("Payment verification failed")
            return {'status': 'error', 'message': 'Payment verification failed'}

        # Extract data
        payment_status = data.get('payment_status')
        org_id = int(data.get('custom_int1', 0))
        subscription_id = int(data.get('custom_int2', 0))
        amount = float(data.get('amount_gross', 0))
        payfast_payment_id = data.get('pf_payment_id')
        token = data.get('token')

        # Get subscription
        subscription = self.db.query(Subscription).filter(
            Subscription.subscription_id == subscription_id
        ).first()

        if not subscription:
            logger.error(f"Subscription {subscription_id} not found")
            return {'status': 'error', 'message': 'Subscription not found'}

        # Update subscription token
        if token and not subscription.payfast_token:
            subscription.payfast_token = token

        # Create payment record
        payment = Payment(
            subscription_id=subscription_id,
            payfast_payment_id=payfast_payment_id,
            payfast_token=token,
            amount=amount,
            status=PaymentStatus.COMPLETE if payment_status == 'COMPLETE' else PaymentStatus.FAILED,
            is_setup_fee=data.get('custom_str1') == 'setup_fee',
            billing_date=datetime.utcnow(),
            paid_at=datetime.utcnow() if payment_status == 'COMPLETE' else None
        )
        self.db.add(payment)

        # Update subscription status
        if payment_status == 'COMPLETE':
            if subscription.status == SubscriptionStatus.TRIAL:
                subscription.status = SubscriptionStatus.ACTIVE
                subscription.subscription_start = datetime.utcnow()

            # Set next billing date (30 days from now)
            subscription.next_billing_date = datetime.utcnow() + timedelta(days=30)
            subscription.updated_at = datetime.utcnow()

            logger.info(f"Payment successful for subscription {subscription_id}")
        else:
            subscription.status = SubscriptionStatus.PAST_DUE
            logger.warning(f"Payment failed for subscription {subscription_id}")

        self.db.commit()

        return {
            'status': 'success',
            'payment_id': payment.payment_id,
            'subscription_status': subscription.status.value
        }

    def _generate_signature(self, data: Dict) -> str:
        """Generate PayFast signature"""
        # Create parameter string
        params_str = '&'.join([f'{k}={urllib.parse.quote_plus(str(v))}' for k, v in sorted(data.items()) if k != 'signature'])

        # Add passphrase
        if self.passphrase:
            params_str += f'&passphrase={urllib.parse.quote_plus(self.passphrase)}'

        # Generate MD5 hash
        signature = hashlib.md5(params_str.encode()).hexdigest()
        return signature

    def _verify_signature(self, data: Dict) -> bool:
        """Verify PayFast signature"""
        received_signature = data.get('signature', '')
        data_copy = {k: v for k, v in data.items() if k != 'signature'}
        calculated_signature = self._generate_signature(data_copy)
        return received_signature == calculated_signature

    def _verify_payment_with_payfast(self, data: Dict) -> bool:
        """Verify payment with PayFast servers"""
        # Build parameter string
        params = '&'.join([f'{k}={urllib.parse.quote_plus(str(v))}' for k, v in data.items()])

        # Call PayFast validation endpoint
        validate_url = "https://sandbox.payfast.co.za/eng/query/validate" if self.mode == "sandbox" else "https://www.payfast.co.za/eng/query/validate"

        try:
            response = requests.post(validate_url, data=params, headers={'Content-Type': 'application/x-www-form-urlencoded'})
            return response.text == 'VALID'
        except Exception as e:
            logger.error(f"PayFast validation error: {e}")
            return False
```

---

### **STEP 5: Create Payment API Endpoints**

Create `backend/app/api/endpoints/payments.py`:

```python
"""Payment and subscription endpoints"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.payfast_service import PayFastService
from app.models.subscription import Subscription, SubscriptionStatus
from pydantic import BaseModel, EmailStr
from typing import Optional

router = APIRouter(prefix="/api/v1/payments")


class CreateSubscriptionRequest(BaseModel):
    """Create subscription request"""
    org_id: int
    num_sites: int
    customer_email: EmailStr
    customer_name: str
    include_setup_fee: bool = True


class UpdateSubscriptionRequest(BaseModel):
    """Update subscription request"""
    num_sites: int


@router.post("/create-subscription")
async def create_subscription(
    request: CreateSubscriptionRequest,
    db: Session = Depends(get_db)
):
    """Create PayFast subscription and return payment URL"""
    service = PayFastService(db)

    try:
        result = service.create_subscription(
            org_id=request.org_id,
            num_sites=request.num_sites,
            customer_email=request.customer_email,
            customer_name=request.customer_name,
            include_setup_fee=request.include_setup_fee
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/subscription/{subscription_id}")
async def get_subscription(
    subscription_id: int,
    db: Session = Depends(get_db)
):
    """Get subscription details"""
    subscription = db.query(Subscription).filter(
        Subscription.subscription_id == subscription_id
    ).first()

    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    return {
        'subscription_id': subscription.subscription_id,
        'org_id': subscription.org_id,
        'status': subscription.status.value,
        'num_sites': subscription.num_sites,
        'monthly_amount': subscription.monthly_amount,
        'next_billing_date': subscription.next_billing_date.isoformat() if subscription.next_billing_date else None,
        'trial_end': subscription.trial_end.isoformat() if subscription.trial_end else None
    }


@router.put("/subscription/{subscription_id}")
async def update_subscription(
    subscription_id: int,
    request: UpdateSubscriptionRequest,
    db: Session = Depends(get_db)
):
    """Update subscription (change number of sites)"""
    service = PayFastService(db)

    try:
        result = service.update_subscription_sites(subscription_id, request.num_sites)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/subscription/{subscription_id}/cancel")
async def cancel_subscription(
    subscription_id: int,
    db: Session = Depends(get_db)
):
    """Cancel subscription"""
    service = PayFastService(db)

    try:
        result = service.cancel_subscription(subscription_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/payfast/webhook")
async def payfast_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    PayFast ITN (Instant Transaction Notification) webhook

    This endpoint receives payment notifications from PayFast
    """
    # Get POST data
    form_data = await request.form()
    data = dict(form_data)

    service = PayFastService(db)
    result = service.handle_webhook(data)

    # PayFast expects "OK" response for successful processing
    if result['status'] == 'success':
        return "OK"
    else:
        raise HTTPException(status_code=400, detail=result['message'])


@router.get("/subscription/{subscription_id}/history")
async def get_payment_history(
    subscription_id: int,
    db: Session = Depends(get_db)
):
    """Get payment history for subscription"""
    from app.models.subscription import Payment

    payments = db.query(Payment).filter(
        Payment.subscription_id == subscription_id
    ).order_by(Payment.created_at.desc()).all()

    return {
        'subscription_id': subscription_id,
        'payments': [
            {
                'payment_id': p.payment_id,
                'amount': p.amount,
                'status': p.status.value,
                'billing_date': p.billing_date.isoformat(),
                'paid_at': p.paid_at.isoformat() if p.paid_at else None,
                'is_setup_fee': p.is_setup_fee
            }
            for p in payments
        ]
    }
```

Register in `backend/app/main.py`:
```python
from app.api.endpoints import payments

app.include_router(payments.router, tags=["payments"])
```

---

### **STEP 6: Create Frontend Payment Flow**

Create `frontend/src/app/billing/page.tsx`:

```typescript
// Billing and subscription management page
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Subscription {
  subscription_id: number;
  org_id: number;
  status: string;
  num_sites: number;
  monthly_amount: number;
  next_billing_date: string | null;
  trial_end: string | null;
}

export default function BillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [numSites, setNumSites] = useState(1);

  useEffect(() => {
    // Fetch current subscription
    // Replace with actual org_id from auth context
    fetchSubscription(1);
  }, []);

  const fetchSubscription = async (orgId: number) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/payments/subscription/${orgId}`
      );
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
        setNumSites(data.num_sites);
      }
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubscription = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/payments/create-subscription`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            org_id: 1, // Replace with actual org_id
            num_sites: numSites,
            customer_email: "user@example.com", // Replace with actual email
            customer_name: "John Doe", // Replace with actual name
            include_setup_fee: !subscription, // Only first time
          }),
        }
      );

      const data = await response.json();

      // Redirect to PayFast payment page
      window.location.href = data.payment_url;
    } catch (error) {
      console.error("Failed to create subscription:", error);
      alert("Failed to create subscription. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    const monthly = 497 * numSites;
    const setup = subscription ? 0 : 2500;
    return { monthly, setup, total: monthly + setup };
  };

  const totals = calculateTotal();

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Billing & Subscription</h1>

      {subscription && subscription.status !== "cancelled" ? (
        /* Existing subscription */
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Current Plan</h2>
              <div className={`inline-block px-3 py-1 rounded-full text-sm ${
                subscription.status === "active" ? "bg-green-100 text-green-800" :
                subscription.status === "trial" ? "bg-blue-100 text-blue-800" :
                "bg-red-100 text-red-800"
              }`}>
                {subscription.status.toUpperCase()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">
                R{subscription.monthly_amount.toLocaleString()}
              </div>
              <div className="text-gray-600">per month</div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Number of sites:</span>
              <span className="font-semibold">{subscription.num_sites}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Price per site:</span>
              <span className="font-semibold">R497</span>
            </div>
            {subscription.next_billing_date && (
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Next billing date:</span>
                <span className="font-semibold">
                  {new Date(subscription.next_billing_date).toLocaleDateString()}
                </span>
              </div>
            )}
            {subscription.trial_end && subscription.status === "trial" && (
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Trial ends:</span>
                <span className="font-semibold text-blue-600">
                  {new Date(subscription.trial_end).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* No subscription or cancelled */
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Start Your Subscription</h2>

          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">
              Number of sites:
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={numSites}
              onChange={(e) => setNumSites(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between mb-2">
              <span>Monthly (R497 × {numSites} sites):</span>
              <span className="font-semibold">R{totals.monthly.toLocaleString()}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Setup fee (one-time):</span>
              <span className="font-semibold">R{totals.setup.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
              <span>First payment:</span>
              <span>R{totals.total.toLocaleString()}</span>
            </div>
            <div className="text-sm text-gray-600 mt-2">
              After setup, you'll pay R{totals.monthly.toLocaleString()}/month
            </div>
          </div>

          <button
            onClick={handleCreateSubscription}
            disabled={loading}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Processing..." : "Continue to Payment"}
          </button>
        </div>
      )}

      {/* Payment History - implement separately */}
    </div>
  );
}
```

---

## ✅ **TESTING CHECKLIST**

### **Sandbox Testing (Before Production)**

1. **Create test subscription:**
   - [ ] Small plan (1 site)
   - [ ] Medium plan (5 sites)
   - [ ] Large plan (10 sites)

2. **Test payment flow:**
   - [ ] Successful payment
   - [ ] Cancelled payment
   - [ ] Failed payment

3. **Test webhook:**
   - [ ] Webhook received correctly
   - [ ] Signature validation works
   - [ ] Payment status updated in database
   - [ ] Subscription activated

4. **Test subscription changes:**
   - [ ] Increase sites (upgrade)
   - [ ] Decrease sites (downgrade)
   - [ ] Cancel subscription
   - [ ] Reactivate subscription

5. **Test edge cases:**
   - [ ] Expired trial period
   - [ ] Failed recurring payment
   - [ ] Multiple orgs with subscriptions

---

## 🚀 **GOING LIVE**

### **Before Production:**

1. **Switch to production credentials:**
   ```bash
   PAYFAST_MODE=production
   PAYFAST_MERCHANT_ID=your_production_merchant_id
   PAYFAST_MERCHANT_KEY=your_production_merchant_key
   PAYFAST_PASSPHRASE=your_production_passphrase
   ```

2. **Update URLs:**
   ```bash
   PAYFAST_RETURN_URL=https://yourdomain.com/payment/success
   PAYFAST_CANCEL_URL=https://yourdomain.com/payment/cancelled
   PAYFAST_NOTIFY_URL=https://api.yourdomain.com/api/v1/payments/payfast/webhook
   ```

3. **Configure PayFast dashboard:**
   - Log into https://www.payfast.co.za
   - Set ITN (webhook) URL
   - Set return/cancel URLs
   - Test with small real payment

4. **Test with real money:**
   - Create subscription with 1 site (R2,997 first payment)
   - Verify payment processes
   - Check webhook fires
   - Confirm subscription activates

---

## 📚 **DOCUMENTATION LINKS**

- **PayFast Documentation:** https://developers.payfast.co.za/docs
- **PayFast Ad Hoc Subscriptions:** https://developers.payfast.co.za/docs#subscriptions
- **PayFast ITN (Webhooks):** https://developers.payfast.co.za/docs#itn

---

**When you're ready to implement PayFast, let me know and I can help with:**
1. Installing dependencies
2. Creating the models and migrations
3. Building the service and endpoints
4. Creating the frontend components
5. Testing the integration

---

*Last updated: 2025-11-07*
