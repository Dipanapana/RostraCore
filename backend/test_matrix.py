import numpy as np
from scipy.optimize import linear_sum_assignment

# Test 1: Some employees have no feasible shifts
print("Test 1: Some employees have no feasible shifts")
m = np.full((31, 168), np.inf)
for i in range(31):
    if i < 20:  # Only first 20 employees have feasible options
        m[i, i] = 1
try:
    row, col = linear_sum_assignment(m)
    print(f"  Success: {len(row)} assignments")
except ValueError as e:
    print(f"  Failed: {e}")

# Test 2: All employees have at least one feasible shift
print("\nTest 2: All employees have feasible shifts")
m = np.full((31, 168), np.inf)
for i in range(31):
    m[i, i] = 1
try:
    row, col = linear_sum_assignment(m)
    print(f"  Success: {len(row)} assignments")
except ValueError as e:
    print(f"  Failed: {e}")

# Test 3: Realistic scenario - 351 feasible pairs spread across 31 employees
print("\nTest 3: Realistic - 351 feasible pairs")
m = np.full((31, 168), np.inf)
# Simulate 351 feasible pairs
import random
random.seed(42)
pairs_added = 0
for emp in range(31):
    num_shifts = random.randint(5, 15)  # Each employee can do 5-15 shifts
    shift_indices = random.sample(range(168), min(num_shifts, 168))
    for shift_idx in shift_indices:
        m[emp, shift_idx] = random.uniform(100, 300)
        pairs_added += 1
        if pairs_added >= 351:
            break
    if pairs_added >= 351:
        break

print(f"  Added {pairs_added} feasible pairs")
print(f"  Employees with at least one feasible shift: {np.sum(np.any(m < np.inf, axis=1))}")
try:
    row, col = linear_sum_assignment(m)
    print(f"  Success: {len(row)} assignments")
except ValueError as e:
    print(f"  Failed: {e}")
