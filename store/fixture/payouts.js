async function load() {
  const payouts = await fetch('api/payouts.json').then(function (res) { return res.json(); });
  await fetch('api/desk.json').then(function (res) { return res.json(); });
  const rows = document.querySelector('#rows');
  payouts.payouts.forEach(function (payout) {
    const tr = document.createElement('tr');
    function cell(className, text) {
      const td = document.createElement('td');
      if (className) td.className = className;
      const span = document.createElement('span');
      span.textContent = text;
      td.append(span);
      return td;
    }
    tr.append(
      cell('vendor', payout.vendor),
      cell('', payout.id),
      cell('status', payout.status),
      cell('', payout.account),
      cell('money', payout.amount)
    );
    rows.append(tr);
  });
}

load();
