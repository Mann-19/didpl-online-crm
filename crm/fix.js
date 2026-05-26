const fs = require('fs');

// Fix people.actions.ts - getClients uses bookings joined from clients
const peopleFile = 'd:/Programming/ELECTRON JS/DIDP - Online/crm/app/(admin)/people.actions.ts';
let people = fs.readFileSync(peopleFile, 'utf8').replace(/\r\n/g, '\n');

// Fix 1: getClients() - bookings joined from clients table (ambiguous due to partner_client_id)
people = people.replace(
  `    bookings (\n      plots (\n        projects ( name )\n      )\n    )`,
  `    bookings!bookings_client_id_fkey (\n      plots (\n        projects ( name )\n      )\n    )`
);

// Fix 2: getClientById() - bookings joined from clients table
people = people.replace(
  `      bookings (\n        id, status, total_amount, discount_amount, booking_date, partner_client_id,\n        partner:partner_client_id ( id, name ),\n        plots ( id, plot_number, project_id, projects ( id, name ) ),\n        payments ( id, amount, payment_date, payment_mode, transaction_id, description, entity_id )\n      )`,
  `      bookings!bookings_client_id_fkey (\n        id, status, total_amount, discount_amount, booking_date, partner_client_id,\n        partner:partner_client_id ( id, name ),\n        plots ( id, plot_number, project_id, projects ( id, name ) ),\n        payments ( id, amount, payment_date, payment_mode, transaction_id, description, entity_id )\n      )`
);

fs.writeFileSync(peopleFile, people);
console.log('Fixed people.actions.ts');

// Fix projects.actions.ts - getProjectClients uses bookings joined via plots, not clients, so it's OK
// But we need to check getProjectsWithStats - it queries FROM plots, joining bookings, which is unambiguous

// Fix plots.actions.ts - getPlotDetails queries FROM plots, joining bookings, which is fine
// The partner join is partner:partner_client_id which is an explicit alias, that's OK

console.log('Done - ambiguous relationship fixed');
