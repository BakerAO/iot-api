const express = require('express');
const app = express();
const routes = require('./routes');

app.use(express.json());

app.use(function(req, res, next) {
   res.header("Access-Control-Allow-Origin", "*");
   res.header("Access-Control-Allow-Headers", "*");
   next();
});

app.use('/', routes);

app.listen(80, () => {
   console.log('Dev Started');
});
