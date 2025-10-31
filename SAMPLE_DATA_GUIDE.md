# RostraCore - Sample Data Guide

## 🎉 Sample Data Successfully Created!

Your RostraCore database is now populated with realistic sample data using South African names and locations.

---

## 📊 Data Summary

### What Was Created:

- **31 Employees** (30 guards + 1 admin user)
  - Armed Guards
  - Unarmed Guards
  - Supervisors
  - Diverse South African names (Zulu, Xhosa, Sotho, Afrikaans, English, Indian)

- **8 Security Sites** across South Africa
  - Johannesburg CBD - Shopping Mall
  - Sandton - Office Building
  - Pretoria Central - Warehouse
  - Cape Town CBD - Hospital
  - Durban Beachfront - School
  - Port Elizabeth Central - Hotel
  - Bloemfontein CBD - Factory
  - East London - Retail Store

- **168 Shifts** (7 days × 8 sites × 3 shifts/day)
  - Morning Shifts: 6am - 2pm
  - Afternoon Shifts: 2pm - 10pm
  - Night Shifts: 10pm - 6am
  - All currently unassigned (ready for rostering!)

- **90 Certifications**
  - PSIRA Grade A, B, C
  - First Aid
  - Fire Safety

- **222 Availability Records**
  - Next 14 days for selected employees

---

## 🚀 How to Use the Sample Data

### 1. View Employees

**API Endpoint:** `GET /api/v1/employees`

```bash
# Using cURL
curl -X GET "http://localhost:8000/api/v1/employees" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**In Swagger UI:** http://localhost:8000/docs

### 2. View Sites

**API Endpoint:** `GET /api/v1/sites`

### 3. View Shifts

**API Endpoint:** `GET /api/v1/shifts`

### 4. Generate a Roster (Auto-Assign Shifts!)

**API Endpoint:** `POST /api/v1/roster/generate`

```json
{
  "start_date": "2025-11-01T00:00:00",
  "end_date": "2025-11-07T23:59:59"
}
```

This will:
- ✅ Match employees to shifts based on skills
- ✅ Check certifications
- ✅ Verify availability
- ✅ Respect hour limits (max 48h/week)
- ✅ Ensure rest periods (min 8h between shifts)
- ✅ Calculate distances (max 50km from home)
- ✅ Optimize costs using Hungarian Algorithm

---

## 👥 Sample Employees

Here are some of the employees in your database:

### Armed Guards (R180/hr)
- Thabo Dlamini - Johannesburg
- Sipho Ngubane - Sandton
- Mandla Mkhize - Pretoria
- Andile Madikizela - Cape Town
- Lerato Mokoena - Durban

### Unarmed Guards (R120/hr)
- Zanele Buthelezi - Port Elizabeth
- Nomsa Zuma - Bloemfontein
- Thandi Sisulu - East London
- Precious Ramaphosa - Nelspruit
- Lindiwe Khumalo - Polokwane

### Supervisors (R250/hr)
- Pieter Van der Merwe - Johannesburg
- Johan Botha - Sandton
- Michael Smith - Cape Town

---

## 🗺️ Site Locations

All sites have GPS coordinates for distance calculations:

| Site | City | Latitude | Longitude |
|------|------|----------|-----------|
| Johannesburg CBD | Johannesburg | -26.2041 | 28.0473 |
| Sandton | Sandton | -26.1076 | 28.0567 |
| Pretoria Central | Pretoria | -25.7479 | 28.2293 |
| Cape Town CBD | Cape Town | -33.9249 | 18.4241 |
| Durban Beachfront | Durban | -29.8587 | 31.0218 |
| Port Elizabeth | Port Elizabeth | -33.9608 | 25.6022 |
| Bloemfontein | Bloemfontein | -29.1211 | 26.2142 |
| East London | East London | -33.0153 | 27.9116 |

---

## 🧪 Test the Rostering Algorithm

### Quick Test:

1. **Login** to get your access token
   ```bash
   curl -X POST "http://localhost:8000/api/v1/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"username": "admin", "password": "admin123"}'
   ```

2. **Generate a roster** for the next week
   ```bash
   curl -X POST "http://localhost:8000/api/v1/roster/generate" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "start_date": "2025-11-01T00:00:00",
       "end_date": "2025-11-07T23:59:59"
     }'
   ```

3. **View the results**
   - Assigned shifts
   - Total cost
   - Unfilled shifts
   - Employee utilization

---

## 📈 Sample Data Statistics

### Employee Distribution:
- **Armed Guards**: ~13 employees (43%)
- **Unarmed Guards**: ~14 employees (47%)
- **Supervisors**: ~3 employees (10%)

### Shift Distribution:
- **Total Shifts**: 168
- **Per Site**: 21 shifts (7 days × 3 shifts/day)
- **Per Day**: 24 shifts (8 sites × 3 shifts/day)

### Coverage:
- **Days**: 7 days (Nov 1-7, 2025)
- **Sites**: 8 locations
- **24/7 Coverage**: Morning, afternoon, and night shifts

---

## 🔄 Regenerating Sample Data

If you want to reset and create fresh sample data:

```bash
cd backend

# Delete the database
rm rostracore.db

# Run migrations
alembic upgrade head

# Create admin user
python create_admin.py

# Create sample data
python create_sample_data.py
```

---

## 📝 Notes About the Data

### ID Numbers
- Generated South African ID numbers (not real people)
- Format: YYMMDDSSSS0SA

### Contact Information
- Email: `firstname.lastname@rostracore.co.za`
- Phone: South African format (`06X-XXX-XXXX`)

### Certifications
- Random distribution of PSIRA grades
- 75% verified, 25% pending
- Valid for 1-2 years from creation date

### Availability
- First 20 employees have availability records
- 80% availability rate (realistic)
- 6am - 10pm availability windows

---

## 🎯 Next Steps

1. ✅ **Login** with admin credentials
2. ✅ **Explore the data** via API docs
3. ✅ **Generate your first roster!**
4. ✅ **View assignments** and optimize
5. ✅ **Generate reports** (coming soon)

---

## 🆘 Troubleshooting

### No shifts showing?
```bash
cd backend
python add_shifts.py
```

### Want more employees?
Edit `create_sample_data.py` and change line 121:
```python
for i in range(50):  # Change from 30 to 50
```

### Database locked?
Close all connections and restart the backend server.

---

## 📚 Related Guides

- [LOGIN_GUIDE.md](LOGIN_GUIDE.md) - How to login and authenticate
- [QUICKSTART.md](QUICKSTART.md) - Quick start guide
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Complete setup instructions

---

**You're all set with sample data!** 🎉

Start exploring your RostraCore application at http://localhost:8000/docs
