const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.APP_PORT;

app.use(bodyParser.json());

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('Unable to connect to MySQL: ' + err.message);
    } else {
        console.log('Connected to MySQL successfully');
    }
});

app.post('/api/callback', (req, res) => {
    const callbackData = req.body;
    console.log('callback', callbackData)

    const updQuery = `UPDATE number_share SET msisdn = ?, error = ? WHERE token = ?`;

    db.query(updQuery, [callbackData.msisdn, callbackData.error ? callbackData.error.name : null, callbackData.token], (err, result) => {
        if (err) {
            console.error('Error saving callback data to MySQL: ' + err.message);
            return res.status(500).json({ error: 'Error saving callback data to the database' });
        } else {
            console.log('Callback data saved successfully');
            return res.status(200).json({ message: 'Callback data saved successfully', data: callbackData });
        }
    });
});

app.get('/redirect', async (req, res) => {
    const clientIp = req.headers['cf-connecting-ip'] || req.ip;
    console.log('req-ip', clientIp)

    var data = {
        consentGranted: true,
        deviceIp: clientIp,
        callbackUrl: `${process.env.APP_BASEURL}/api/callback`,
        returnUrl: process.env.APP_RETURNURL
    }
    data = JSON.stringify(data);

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${process.env.INFOBIP_API_URL}/mi/ns/1/resolve`,
        headers: { 
            'Authorization': `App ${process.env.INFOBIP_API_KEY}`,
            'Content-Type': 'application/json'
        },
        data : data
    };

    axios.request(config).then((response) => {
        console.log('External API response:', response.data);
        if (response.data.status === "REDIRECT") {
            res.redirect(response.data.deviceRedirectUrl)
            return
        }
        res.status(200).json({ message: 'API call successful', apiResponse: response.data });
    }).catch((error) => {
        console.error('Error calling external API:', error.response.data);
        res.status(500).json({ error: 'Error calling external API' });
    });

});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
