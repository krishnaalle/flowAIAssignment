const express = require("express")
const app = express()
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
app.use(express.json());
let db = null;

const dbPath = path.join(__dirname, "expense_tracker.db");

const initializeDBAndServer = async () => {
    try {
      db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
      });
      app.listen(5000, () => {
        console.log("Server Running at http://localhost:5000/");
      });
    } catch (error) {
      console.log(`DB Error: ${error.message}`);
      process.exit(1);
    }
  };
  initializeDBAndServer();

  app.post('/transactions', (request, response) => {
    const transactionDetails = request.body;
    const { type, category, amount, date, description } = transactionDetails;
    // Simple query to insert a new transaction
    const createTransactionQuery = `
        INSERT INTO 
        transactions (type, category, amount, date, description)
        VALUES (
            '${type}',
            ${category},
            ${amount},
            '${date}',
            '${description}'
        );`;
    console.log(createTransactionQuery, 'createTransactionQuery')
    db.run(createTransactionQuery, function(err) {
        if (err) {
            return response.status(500).send("Error adding transaction");
        }
        response.send("Transaction Successfully Added");
    });
});

app.get('/transactions', async (request, response) => {
    const getTransactionQuery = 'SELECT * FROM transactions;';
    const transactions = await db.all(getTransactionQuery);
    console.log(transactions);
    response.send(transactions);
});

app.get("/transactions/:transactionId", async(request, response) => {
    const {transactionId} = request.params;
    const getTransactionQuery = `SELECT * FROM transactions WHERE id = ${transactionId}`;
    const transaction = await db.get(getTransactionQuery);
    console.log(transaction)
    response.send(transaction)
})

app.put("/transactions/:transactionId", async(request, response) =>{
    const transactionId = request.params;
    const transactionDetails = request.body;
    const {type, category, amount, date, description} = transactionDetails;
    const updateTransactionQuery = `UPDATE transaction set 
                                    type = '${type}',
                                    category = ${category},
                                    amount = ${amount},
                                    date = '${date}',
                                    description = '${description}'
                                    WHERE id= ${transactionId}`
    await db.run(updateTransactionQuery);
    response.send("Transaction Updated Successfully")                   
})

app.delete("/transactions/:transactionId", async(request, response) => {
    const { transactionId } = request.params;
    const deleteTransactionQuery = `DELETE FROM transactions WHERE id = ${transactionId}`;
    await db.run(deleteTransactionQuery)
    response.send("Transaction Deleted");
});

app.get("/summary", async (request, response) => {
    const { startDate, endDate, category } = request.query;

    let baseQuery = `
        SELECT 
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS totalIncome,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS totalExpenses
        FROM transactions`;

    let conditions = [];
    const params = [];

    if (startDate && endDate) {
        conditions.push("date BETWEEN ? AND ?");
        params.push(startDate, endDate);
    }

    if (category) {
        conditions.push("category = ?");
        params.push(category);
    }

    if (conditions.length > 0) {
        baseQuery += " WHERE " + conditions.join(" AND ");
    }

    try {
        const row = await db.get(baseQuery, params);
        const totalIncome = (row && row.totalIncome) ? row.totalIncome : 0;
        const totalExpenses = (row && row.totalExpenses) ? row.totalExpenses : 0;
        const balance = totalIncome - totalExpenses;

        response.json({ totalIncome, totalExpenses, balance });
    } catch (err) {
        console.error("Error retrieving summary:", err);
        response.status(500).send("Error retrieving summary");
    }

});



module.exports = app;