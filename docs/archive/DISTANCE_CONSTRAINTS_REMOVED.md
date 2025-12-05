# Distance Constraints Removed from Roster Generation

**Date:** November 14, 2025
**Status:** ✅ **COMPLETED**

---

## Summary

All distance-based constraints and penalties have been **completely removed** from the roster generation system. Guards can now be assigned to any site regardless of distance from their home location.

---

## What Was Changed

### 1. Production CP-SAT Optimizer (`production_optimizer.py`)

**Changes:**
- ✅ Removed `max_distance_km` from `OptimizationConfig`
- ✅ Removed `distance_penalty_per_km` from config
- ✅ Removed distance checking from feasibility checks
- ✅ Removed travel cost calculation from assignment cost
- ✅ Updated documentation to note distance constraints are removed

**Impact:**
- Guards can be assigned to ANY site
- Assignment cost only considers: labor cost + night premium + weekend premium
- NO travel/distance penalties

### 2. Hungarian Algorithm (`roster_generator.py`)

**Changes:**
- ✅ Removed `self.max_distance_km` initialization
- ✅ Removed `_check_distance()` call from feasibility checking
- ✅ Removed distance penalty from cost calculation
- ✅ Updated cost formula documentation

**Impact:**
- Constraint checking no longer filters by distance
- Cost = hourly_rate × hours (no distance component)

### 3. MILP CP-SAT Generator (`milp_roster_generator.py`)

**Changes:**
- ✅ Removed `self.max_distance_km` initialization
- ✅ Removed distance constraint check from feasibility matrix
- ✅ Removed distance penalty from cost calculation
- ✅ Removed distance tracking from feasibility results

**Impact:**
- Feasibility matrix doesn't reject based on distance
- Cost = labor_cost only (no distance penalty)

### 4. API Endpoint (`roster.py`)

**Changes:**
- ✅ Removed `max_distance_km` parameter from `OptimizationConfig` initialization (both occurrences)

**Impact:**
- API no longer passes distance configuration to optimizers
- Roster generation ignores distance settings

---

## Files Modified

1. `backend/app/algorithms/production_optimizer.py`
2. `backend/app/algorithms/roster_generator.py`
3. `backend/app/algorithms/milp_roster_generator.py`
4. `backend/app/api/endpoints/roster.py`

---

## Before vs After

### Before (with distance constraints):

```python
# Feasibility check included distance
if distance_km > self.config.max_distance_km:
    reasons.append(f"Distance {distance_km:.1f}km exceeds max")

# Cost calculation included travel penalty
travel_cost = distance_km * distance_penalty_per_km
total_cost = base_cost + travel_cost
```

**Result:** Guards couldn't be assigned if too far from site

---

### After (no distance constraints):

```python
# No distance checking in feasibility
# NOTE: Distance constraints removed - guards can work anywhere

# Cost calculation only labor + premiums
total_cost = base_cost  # No travel cost
```

**Result:** Guards can be assigned regardless of distance

---

## What This Means

### ✅ Enabled:
- **Assign any guard to any site** - No distance restrictions
- **Simpler cost calculations** - Only labor + premiums
- **More assignment flexibility** - Broader feasibility pool
- **Easier testing** - No GPS coordinates needed

### ❌ No Longer Available:
- Distance-based filtering
- Travel cost penalties
- Location-aware optimization
- GPS distance calculations in roster generation

---

## Configuration Changes

### Settings No Longer Used:
- `MAX_DISTANCE_KM` - No longer checked by any optimizer
- Distance penalty settings - Removed from configs

**Note:** These settings may still exist in `config.py` but are **ignored** by roster generation algorithms.

---

## Testing Impact

### What Still Works:
- ✅ All roster generation algorithms (production, hungarian, milp)
- ✅ BCEA compliance constraints (48h weekly, 8h rest)
- ✅ Skills and certification matching
- ✅ Availability checking
- ✅ Fairness and workload balancing
- ✅ Cost optimization (labor + premiums)

### What Changed:
- ⚠️ Guards can now be assigned to distant sites
- ⚠️ Assignment costs no longer include travel penalties
- ⚠️ Feasibility matrix will have MORE feasible pairs (more options)

---

## Migration Notes

### If You Had GPS Data:
- GPS coordinates in `employees` table are **no longer used** for roster generation
- GPS coordinates in `sites` table are **no longer used** for roster generation
- You can keep GPS data for other features (maps, reports, etc.)

### If You Relied on Distance Filtering:
- **Manual filtering:** You'll need to manually filter assignments by location
- **Post-processing:** Add custom logic to prefer nearby assignments if needed
- **UI warnings:** Consider adding UI warnings for long-distance assignments

---

## API Behavior

### Endpoint: `POST /api/v1/roster/generate`

**Request:**
```json
{
  "start_date": "2025-11-15",
  "end_date": "2025-11-22",
  "site_ids": [1, 2, 3]
}
```

**Query Parameter:**
- `algorithm=production` (or `hungarian`, `milp`, `auto`)

**Response:**
- Same structure as before
- `assignments` may include guards assigned to ANY site
- `cost` calculations no longer include travel penalties

---

## Rollback Instructions

**If you need to restore distance constraints:**

1. Revert this commit
2. Or manually restore these checks in each optimizer:
   - Add `max_distance_km` back to configs
   - Add `_check_distance()` calls back to feasibility checks
   - Add `travel_cost` back to cost calculations
   - Update API endpoints to pass `max_distance_km`

---

## Verification Steps

### Test That Distance Is Ignored:

1. **Create test data:**
   ```sql
   -- Employee in Cape Town
   UPDATE employees SET home_gps_lat = -33.9249, home_gps_lng = 18.4241 WHERE employee_id = 1;

   -- Site in Johannesburg (1400km away)
   UPDATE sites SET gps_lat = -26.2041, gps_lng = 28.0473 WHERE site_id = 1;
   ```

2. **Generate roster:**
   ```bash
   POST /api/v1/roster/generate
   {
     "start_date": "2025-11-15",
     "end_date": "2025-11-16",
     "site_ids": [1]
   }
   ```

3. **Expected result:**
   - ✅ Employee 1 CAN be assigned to Site 1
   - ✅ No "too_far" or distance-related errors
   - ✅ Assignment cost does NOT include 1400km × penalty

---

## Related Configuration

### Settings Still Active:
```python
# In backend/app/config.py
MAX_HOURS_WEEK = 48  # ✅ Still enforced
MIN_REST_HOURS = 8   # ✅ Still enforced
OT_MULTIPLIER = 1.5  # ✅ Still used
FAIRNESS_WEIGHT = 0.2  # ✅ Still used
```

### Settings Now Ignored:
```python
MAX_DISTANCE_KM = 50  # ❌ No longer checked
```

---

## Performance Impact

### Positive:
- ✅ **Faster feasibility checks** - One less constraint to evaluate
- ✅ **Simpler cost calculations** - No haversine distance calculations
- ✅ **More feasible pairs** - Broader assignment options
- ✅ **Higher fill rates** - Easier to fill all shifts

### Neutral:
- 📊 Solver time should be similar (CP-SAT handles larger feasibility sets well)
- 📊 Memory usage negligible difference

---

## Support

**If you encounter issues after this change:**

1. Check that backend was restarted to load new code
2. Verify roster generation still works: Test with `POST /api/v1/roster/generate`
3. Check backend logs for any distance-related warnings
4. Run diagnostic: `python backend/test_roster_readiness.py`

**If roster generation fails:**
- Check that guards, sites, and shifts exist
- Verify other constraints (skills, certifications, availability)
- Check backend logs for specific error messages

---

## Summary

**Distance constraints have been completely removed from all roster generation algorithms.**

✅ Guards can be assigned to **ANY** site regardless of distance
✅ Assignment costs no longer include travel penalties
✅ Roster generation is now **location-agnostic**
✅ All other constraints (BCEA, skills, certifications) still enforced

**Ready for production use!**
