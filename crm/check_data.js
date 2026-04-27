const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://fbthhsxsmnmwoizhxlkv.supabase.co', 'sb_publishable_Mmzohh6jDD5fnf7tYXp64g_P0odsBqi');

async function check() {
    const { data: projects } = await s.from('projects').select('id, name');
    console.log('Projects:', JSON.stringify(projects, null, 2));
    
    const warehouse = projects.find(p => p.name.toLowerCase().includes('warehouse') || p.name.toLowerCase().includes('logistic'));
    if (warehouse) {
        const { data: plots } = await s.from('plots').select('plot_number').eq('project_id', warehouse.id);
        console.log('Plots for', warehouse.name, ':', plots.map(p => p.plot_number).sort((a,b) => a-b));
    }
}

check();
