# Roster Generation Guide

This guide explains how to use RostraCore's automated roster generation system.

## Overview

RostraCore uses an AI-powered optimization algorithm (CP-SAT) to automatically assign guards to shifts while respecting:
- BCEA labor law requirements
- PSIRA grade requirements
- Guard availability
- Site staffing needs
- Premium pay considerations

## Prerequisites

Before generating a roster, ensure:

1. **Employees are set up** with:
   - Active status
   - Valid PSIRA certification
   - Hourly rate defined
   - Availability entered

2. **Sites are configured** with:
   - Required PSIRA grade
   - Number of guards needed
   - Armed/unarmed designation

3. **Shifts are created** for the period

## Generating a Roster

### Step 1: Navigate to Roster
Click **Roster** in the sidebar

### Step 2: Select Date Range
1. Choose **Start Date** (usually Monday)
2. Choose **End Date** (usually Sunday)
3. The system defaults to the upcoming week

### Step 3: Review Options

| Option | Description |
|--------|-------------|
| Include Pending | Include shifts with pending assignments |
| Respect Preferences | Honor guard day-off preferences |
| Optimize Cost | Minimize overtime and premium pay |
| Balance Hours | Distribute hours evenly |

### Step 4: Generate
1. Click **Generate Roster**
2. Wait for the algorithm to complete (typically 10-30 seconds)
3. Review the generated assignments

## Understanding the Results

### Assignment Status
- **Filled (Green)**: Shift has required number of guards
- **Partial (Yellow)**: Some positions unfilled
- **Empty (Red)**: No guards assigned

### Constraint Violations
If any constraints couldn't be met, you'll see warnings:
- "Guard X exceeds 48h/week" - BCEA violation
- "No Grade B guard available" - PSIRA mismatch
- "Insufficient rest period" - 8-hour rule

## Manual Adjustments

### Swapping Guards
1. Click on an assignment
2. Click **Swap**
3. Select a different available guard
4. Confirm the change

### Adding Guards
1. Click on a shift with unfilled positions
2. Click **+ Assign**
3. Select from available guards
4. The system shows eligibility status

### Removing Assignments
1. Click on an assignment
2. Click **Remove**
3. Confirm removal

## Confirming the Roster

### Review Process
1. Check all shifts are adequately staffed
2. Review any constraint warnings
3. Verify critical sites have coverage

### Confirm
1. Click **Confirm Roster**
2. Assignments change from "Pending" to "Confirmed"
3. Guards can now see their schedules

## BCEA Compliance

The roster generator enforces South African labor law:

### Maximum Hours
- **48 hours per week** maximum
- Spread across regular and overtime

### Rest Periods
- **8 hours minimum** between shifts
- **1 day off** per week recommended

### Overtime
- Hours beyond 45/week = overtime
- Overtime rate: 1.5x regular rate

## Premium Pay Calculation

The system automatically calculates premiums:

| Premium Type | Rate |
|--------------|------|
| Night Shift (18:00-06:00) | +10% |
| Saturday | +1.5x |
| Sunday | +2x |
| Public Holiday | +2x |

## Troubleshooting

### "No Solution Found"
This means the algorithm couldn't satisfy all constraints:
1. Check if enough guards are available
2. Verify PSIRA grades match site requirements
3. Ensure guards have availability set
4. Try relaxing optional constraints

### "Infeasible Constraints"
Hard constraints that couldn't be met:
1. Review constraint details
2. May need to add more guards
3. Consider splitting shifts

### "Suboptimal Solution"
A valid roster was found but not perfectly optimized:
1. Review total cost
2. Check hour distribution
3. May improve with more guards

## Best Practices

1. **Generate weekly** - Run every Friday for the next week
2. **Review thoroughly** - Check all assignments before confirming
3. **Keep data current** - Update availability regularly
4. **Plan ahead** - Account for holidays and events
5. **Track metrics** - Monitor fill rates and costs
