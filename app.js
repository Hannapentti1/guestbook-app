const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const dataPath = path.join(__dirname, 'data', 'guestbook.json');

// Palvelee tiedostot kansiosta "styles"
app.use('/styles', express.static(path.join(__dirname, 'styles')));

// Parserit lomakkeille ja JSONille
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// 1) Etusivu
app.get('/', (req, res) => {
  res.send(`
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/styles/styles.css">

    <div class="container py-4 text-center">
      <h1>Vieraskirja</h1>
      <p>Tervetuloa — valitse toiminto alla.</p>
      <nav class="mt-3">
        <a class="btn btn-primary me-2" href="/guestbook">Näytä vieraskirja</a>
        <a class="btn btn-secondary me-2" href="/newmessage">Lisää viesti</a>
        <a class="btn btn-success" href="/ajaxmessage">AJAX-lomake</a>
      </nav>
    </div>
  `);
});

// 2) /guestbook – näyttää JSON-datan taulukkona
app.get('/guestbook', (req, res) => {
  const raw = fs.readFileSync(dataPath, 'utf8');
  const messages = JSON.parse(raw);

  let rows = messages.map(m => `
    <tr>
      <td>${m.username}</td>
      <td>${m.country}</td>
      <td>${m.date}</td>
      <td>${m.message}</td>
    </tr>`).join('');

  res.send(`
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/styles/styles.css">

    <div class="container py-4">
      <h2>Vieraskirjan viestit</h2>
      <table class="table table-striped table-dark table-bordered">
        <thead>
          <tr><th>Nimi</th><th>Maa</th><th>Päivämäärä</th><th>Viesti</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <a class="btn btn-light" href="/">Takaisin</a>
    </div>
  `);
});

// 3) /newmessage – lomake + POST
app.get('/newmessage', (req, res) => {
  res.send(`
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/styles/styles.css">

    <div class="container py-4">
      <h2>Lisää uusi viesti</h2>
      <form action="/newmessage" method="post" class="row g-3">
        <div class="col-12"><input name="username" class="form-control" placeholder="Nimi" required></div>
        <div class="col-12"><input name="country" class="form-control" placeholder="Maa" required></div>
        <div class="col-12"><textarea name="message" class="form-control" placeholder="Viesti" required></textarea></div>
        <div class="col-12"><button class="btn btn-primary" type="submit">Lähetä</button></div>
      </form>
      <a class="btn btn-link mt-3" href="/">Takaisin</a>
    </div>
  `);
});

app.post('/newmessage', (req, res) => {
  const { username, country, message } = req.body;
  if (!username || !country || !message) {
    return res.status(400).send('Täytä kaikki kentät! <a href="/newmessage">Takaisin</a>');
  }

  const raw = fs.readFileSync(dataPath, 'utf8');
  const messages = JSON.parse(raw);

  const newEntry = {
    id: (messages.length ? String(Number(messages[messages.length - 1].id) + 1) : "1"),
    username,
    country,
    message,
    date: new Date().toLocaleString()
  };

  messages.push(newEntry);
  fs.writeFileSync(dataPath, JSON.stringify(messages, null, 2), 'utf8');

  res.redirect('/guestbook');
});

// 4) /ajaxmessage – AJAX-versio lomakkeesta
app.get('/ajaxmessage', (req, res) => {
  res.send(`
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/styles/styles.css">

    <div class="container py-4">
      <h2>AJAX-lomake</h2>
      <div class="mb-3"><input id="username" class="form-control" placeholder="Nimi" required></div>
      <div class="mb-3"><input id="country" class="form-control" placeholder="Maa" required></div>
      <div class="mb-3"><textarea id="message" class="form-control" placeholder="Viesti" required></textarea></div>
      <button id="sendBtn" class="btn btn-success">Lähetä AJAXilla</button>
      <div id="response" class="mt-4"></div>
      <a class="btn btn-link mt-3" href="/">Takaisin</a>
    </div>

    <script>
      document.getElementById('sendBtn').addEventListener('click', async () => {
        const username = document.getElementById('username').value.trim();
        const country = document.getElementById('country').value.trim();
        const message = document.getElementById('message').value.trim();
        if (!username || !country || !message) { alert('Täytä kaikki kentät!'); return; }

        const res = await fetch('/ajaxmessage', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ username, country, message })
        });
        const data = await res.json();
        document.getElementById('response').innerHTML =
          '<h4>Viestit</h4>' +
          data.map(m =>
            '<p><b>' + m.username + '</b> (' + m.country + '): ' +
            m.message + ' <i>' + m.date + '</i></p>'
          ).join('');
      });
    </script>
  `);
});

app.post('/ajaxmessage', (req, res) => {
  const { username, country, message } = req.body;
  if (!username || !country || !message)
    return res.status(400).json({ error: 'Täytä kaikki kentät' });

  const raw = fs.readFileSync(dataPath, 'utf8');
  const messages = JSON.parse(raw);

  const newEntry = {
    id: (messages.length ? String(Number(messages[messages.length - 1].id) + 1) : "1"),
    username,
    country,
    message,
    date: new Date().toLocaleString()
  };

  messages.push(newEntry);
  fs.writeFileSync(dataPath, JSON.stringify(messages, null, 2), 'utf8');

  res.json(messages);
});

app.set('port', PORT);

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));

