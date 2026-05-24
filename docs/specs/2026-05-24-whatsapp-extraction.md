# Spec: WhatsApp Order Extraction Logic

## Goal
Enable WhatsApp agents to paste raw conversation text and receive a structured JSON object containing customer identity, product selection, and shipping details. This reduces manual data entry errors and speeds up the "Draft Order" process.

## Out of scope
- Direct writing to Shopify/WooCommerce APIs (V2).
- Automatic message fetching from Meta API (requires manual paste in V1).

## Files to be touched
- `/Users/mahmoudezz/OminaHouse/app/api/ai/extract/route.ts` {role: new}
- `/Users/mahmoudezz/OminaHouse/lib/prompts.ts`              {role: new}
- `/Users/mahmoudezz/OminaHouse/app/(office)/whatsapp-order-room/page.tsx` {role: edit}

## Schema delta
- No schema changes required; uses existing `order_submissions` and `ai_extractions` tables (to be created in the next migration).

## Behaviour
1. **Input:** Agent pastes text into a `Textarea`.
2. **Trigger:** "Extract Intelligence" button sends text to `/api/ai/extract`.
3. **Processing:** The API uses a system prompt to identify `customer_name`, `phone`, `items` (matched against inventory), `address`, and `intent`.
4. **Refinement:** The AI flags "Missing Fields" (e.g., if the city is missing from the address).
5. **Output:** The UI populates a review form where the agent confirms the data before saving.

## RLS / permissions
- Only roles `Owner`, `Admin`, `WhatsApp Manager`, and `WhatsApp Agent` can invoke the extraction endpoint.
- All extractions are logged with the `user_id` for audit purposes.

## Tests
1. **Full Extraction:** Verify a standard "I want to buy X, my address is Y" chat returns all fields.
2. **Partial Extraction:** Verify a "How much is X?" chat marks `intent` as `inquiry` and leaves `address` null.
3. **Formatting:** Verify phone numbers are normalized to E.164 (e.g., +971...).

## Open questions for Mahmoud
1. **AI Model:** Approved: GPT-4o for V1 to ensure maximum extraction accuracy and trust.
2. **Language:** Approved: Full support for Arabic-to-English translation and transliteration.
3. **Price Matching:** Approved: AI will flag price drift if mentioned prices deviate from structured data.

**Status: Approved**