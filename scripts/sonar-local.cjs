#!/usr/bin/env node
'use strict';
const { spawnSync } = require('child_process');

if (!process.env.SONAR_TOKEN) {
  console.log('Sonar ignoré : SONAR_TOKEN non défini.');
  process.exit(0);
}

const result = spawnSync('sonar-scanner', [], { stdio: 'inherit', shell: true });
if (result.error) {
  console.log(
    'sonar-scanner introuvable — ignoré. Installez-le : https://docs.sonarsource.com/sonarqube-cloud/advanced-setup/ci-based-analysis/sonarscanner-cli/get-started/'
  );
  process.exit(0);
}
process.exit(result.status ?? 1);
