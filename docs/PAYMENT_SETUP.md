# LXE Photography payment setup

## Recommended production flow

1. Lexus confirms the session date and collection.
2. The client receives the private payment link.
3. The client pays the $25 retainer through Square using a supported card or wallet option.
4. Cash App remains a confirmed-client backup only.
5. The remaining balance is collected by Square invoice, payment link, or an agreed in-person method.

## Add the Square retainer link

Edit `config.js` and paste the complete Square payment-link URL into `payments.squareRetainerUrl`.

```js
payments: {
  squareRetainerUrl: "https://square.link/u/REPLACE-ME",
  cashAppUrl: "https://cash.app/$lexuslynnh",
  cashAppHandle: "$lexuslynnh",
  cashAppAccountName: "Lexus Hilton"
}
```

When `squareRetainerUrl` is empty, the public site does not show a broken Square button. It tells confirmed clients that Lexus will send payment instructions privately.

## Before publishing the Square link

- Confirm the item name clearly says `LXE Photography — $25 Session Retainer`.
- Confirm the amount is exactly $25.
- Confirm the link accepts the payment methods enabled in the Square account.
- Complete a real $1 or test transaction if Square offers an appropriate test method.
- Verify the receipt identifies LXE Photography clearly.
- Verify refunds, disputes, and customer-support contact details are correct.
- Never instruct a customer to pay before Lexus confirms the date.
