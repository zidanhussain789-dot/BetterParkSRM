const express = require('express');
const cron = require('node-cron');
const Stripe = require('stripe')('your_stripe_secret_key'); // Replace with your key

const app = express();
app.use(express.json());

// --- CRON JOB FOR BILLING ---
// This runs every 10 minutes to check for overtime vehicles.
cron.schedule('*/10 * * * *', async () => {
  console.log('Running overtime parking check...');

  // 1. Find sessions that are for guests/unregistered and are over 2 hours long
  const overtimeSessions = await findOvertimeSessions(); // You'd write this database query function

  for (const session of overtimeSessions) {
    const startTime = session.startTime;
    const now = new Date();
    const hoursParked = (now - startTime) / (1000 * 60 * 60);

    if (hoursParked > 2) {
      const minutesOvertime = (hoursParked - 2) * 60;
      const thirtyMinuteIntervals = Math.floor(minutesOvertime / 30);
      const amountToCharge = thirtyMinuteIntervals * 5.00; // Example: $5.00 per 30 mins

      // 2. Charge the user via Stripe
      await chargeUser(session.userID, amountToCharge); // You'd write this function to call the Stripe API

      // 3. Update the session in the database to reflect the charge
      await updateSessionBilling(session.sessionID, amountToCharge);
    }
  }
});


// --- API ENDPOINT EXAMPLE ---
app.post('/api/park', async (req, res) => {
    const { userId, vehicleId } = req.body;
    
    // Logic to find an available spot in Redis
    const availableSpot = await findAvailableSpot();
    
    if (availableSpot) {
        // Logic to create a new ParkingSession in PostgreSQL
        const session = await createParkingSession(userId, vehicleId, availableSpot);
        res.status(200).json({ success: true, session: session });
    } else {
        res.status(400).json({ success: false, message: "No spots available." });
    }
});


app.listen(3000, () => console.log('Server running on port 3000'));

// You would need to implement the helper functions:
// findOvertimeSessions(), chargeUser(), updateSessionBilling(), findAvailableSpot(), createParkingSession()
