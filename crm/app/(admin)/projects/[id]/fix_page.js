const fs = require('fs');
let c = fs.readFileSync('page.tsx', 'utf8');

c = c.replace(/          <div className="bg-white p-5 rounded-md border border-gray-200 flex items-center justify-between">\r?\n\s*<div>\r?\n\s*<p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Lands<\/p>\r?\n\s*<p className="text-2xl font-bold text-gray-900 mt-1">\{project\.totalPlots\}<\/p>\r?\n\s*<\/div>\r?\n\s*<div className={`p-3 rounded-md bg-gray-100 text-gray-600`}>\r?\n\s*<LayoutGrid className="w-5 h-5" \/>\r?\n\s*<\/div>\r?\n\s*<\/div>/, `          <Link href={\`/projects/\${projectId}/plots\`}>
            <div className="bg-white p-5 rounded-md border border-gray-200 flex items-center justify-between hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group h-full">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide group-hover:text-gray-900 transition-colors">Total Lands</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{project.totalPlots}</p>
              </div>
              <div className={\`p-3 rounded-md bg-gray-100 text-gray-600 group-hover:bg-gray-200 transition-colors\`}>
                <LayoutGrid className="w-5 h-5" />
              </div>
            </div>
          </Link>`);

c = c.replace(/          \{\/\* Available \*\/\}\r?\n\s*<div className="bg-white p-5 rounded-md border border-gray-200 flex items-center justify-between">\r?\n\s*<div>\r?\n\s*<p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Available<\/p>\r?\n\s*<p className="text-2xl font-bold text-emerald-600 mt-1">\{project\.availablePlots\}<\/p>\r?\n\s*<\/div>\r?\n\s*<div className={`p-3 rounded-md bg-emerald-100 text-emerald-600`}>\r?\n\s*<Circle className="w-5 h-5" \/>\r?\n\s*<\/div>\r?\n\s*<\/div>/, `          {/* Available */}
          <Link href={\`/projects/\${projectId}/plots?status=available\`}>
            <div className="bg-white p-5 rounded-md border border-gray-200 flex items-center justify-between hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group h-full">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide group-hover:text-emerald-600 transition-colors">Available</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{project.availablePlots}</p>
              </div>
              <div className={\`p-3 rounded-md bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors\`}>
                <Circle className="w-5 h-5" />
              </div>
            </div>
          </Link>`);


c = c.replace(/          \{\/\* Clients \*\/\}\r?\n\s*<Link href=\{\`\/projects\/\$\{projectId\}\/clients\`\}>/, `          {/* Cancelled */}
          <Link href={\`/projects/\${projectId}/clients?status=cancelled\`}>
            <div className="bg-white p-5 rounded-md border border-gray-200 flex items-center justify-between hover:border-gray-400 hover:shadow-md transition-all cursor-pointer group h-full">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide group-hover:text-gray-700 transition-colors">Cancelled</p>
                <p className="text-2xl font-bold text-gray-600 mt-1">{project.cancelledPlots || 0}</p>
              </div>
              <div className={\`p-3 rounded-md bg-gray-100 text-gray-600 group-hover:bg-gray-600 group-hover:text-white transition-colors\`}>
                <XCircle className="w-5 h-5" />
              </div>
            </div>
          </Link>

          {/* Clients */}
          <Link href={\`/projects/\${projectId}/clients\`}>`);

fs.writeFileSync('page.tsx', c);
console.log('page.tsx updated successfully.');
