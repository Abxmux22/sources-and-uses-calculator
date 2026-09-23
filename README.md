# Sources & Uses Calculator

A responsive real estate sources-and-uses web calculator with live cost-per-unit, allocation, loan-to-cost, loan-to-value, capital raise, and PDF calculations.

## Run locally

Run `python server.py`, then open `http://localhost:8000`.

## Calculations

- Cost per unit = each use divided by number of units
- Use allocation = each use divided by total uses
- Capital raise needed = total uses minus loan and other loan source
- Loan to cost = source divided by total uses
- Loan to value = source divided by purchase price

The app is self-contained and does not require third-party packages or a database.
