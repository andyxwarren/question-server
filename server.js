const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve static files from the root directory

const csvFilePath = path.join(__dirname, 'user_adventure.csv');

// Endpoint to log user adventure data
app.post('/log-adventure', (req, res) => {
    const { serve_id, user_id, question_id, time_served, time_submitted, is_correct, user_answer, batch_id } = req.body;

    // The database handles serve_id, so we leave it empty for the CSV
    const csvRow = `\n,${user_id},${question_id},${time_served},${time_submitted},${is_correct},"${user_answer}",${batch_id || ''}`;

    fs.appendFile(csvFilePath, csvRow, (err) => {
        if (err) {
            console.error('Failed to write to CSV:', err);
            return res.status(500).send('Error saving data');
        }
        res.status(200).send('Data saved');
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
