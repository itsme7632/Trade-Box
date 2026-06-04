---
name: TradeBox commission system
description: Architecture of the guild referral commission engine — shared library, tier tracking, dual trigger points
---

## Rule
Always use `processGuildCommissions()` from `artifacts/api-server/src/lib/commission.ts` — never inline the commission logic again.

## How it works
- Tier structure: investor's profit × 7% (tier1) / 2% (tier2) / 1% (tier3) paid to 3 levels up the referral chain
- Tier stored in `transactions.notes` as "1", "2", or "3" — NOT in the description
- `parseTier(notes, description)` handles legacy records (notes=null) by parsing "Tier N commission from …" in description
- `relatedUserId` = the investor who triggered the commission (for audit trail)
- `shipmentId` = the delivered shipment

## Trigger points (both call the same function)
1. `POST /admin/shipments/:id/deliver` — manual admin delivery
2. `socket.ts` hourly cron — auto-delivers `in_transit` shipments past `arrivalDate`

## Why
Shared library eliminates divergence between manual and cron delivery paths. Tier in notes field enables O(1) programmatic tier lookup vs regex parsing of description strings.

## How to apply
Any new place that delivers a shipment investment must call `processGuildCommissions(investorId, investorTraderId, profit, shipmentId, shipmentTitle, triggeredBy)`.
