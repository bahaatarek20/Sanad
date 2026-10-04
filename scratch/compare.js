const fs = require('fs');
const custom = JSON.parse(fs.readFileSync('data/sanad_custom_courses.json', 'utf8'));

// Read curriculum titles
const currTxt = fs.readFileSync('src/lib/curriculum-data.ts', 'utf8');
const currMap = {};
const regex = /slug:\s*'([^']+)',\s*\n\s*title:\s*'([^']+)'/g;
let match;
while ((match = regex.exec(currTxt)) !== null) {
  currMap[match[1]] = match[2];
}

custom.forEach((c) => {
  const canonicalTitle = currMap[c.slug];
  if (canonicalTitle && canonicalTitle !== c.title) {
    console.log('Diff [' + c.slug + ']:');
    console.log('   Custom:    "' + c.title + '"');
    console.log('   Canonical: "' + canonicalTitle + '"');
  }
});
