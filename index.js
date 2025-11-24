const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');

/**
 * Main entry point for the ESB/ACE12 Checklist Action
 * This action validates ESB/ACE12 service repositories for compliance
 */
async function run() {
  try {
    // Get inputs
    const token = core.getInput('github-token') || process.env.GITHUB_TOKEN;
    const configRepoToken = core.getInput('config-repo-token') || process.env.ESB_ACE12_ORG_REPO_TOKEN;
    const skipReadmeValidation = core.getInput('skip-readme-validation') === 'true';
    
    core.info('🚀 Starting ESB/ACE12 Checklist Validation');
    core.info(`Node.js version: ${process.version}`);
    
    // Get context
    const context = github.context;
    const { payload } = context;
    
    // Log context information
    core.info(`Repository: ${context.repo.owner}/${context.repo.repo}`);
    core.info(`Event: ${context.eventName}`);
    
    if (payload.pull_request) {
      core.info(`PR #${payload.pull_request.number}: ${payload.pull_request.title}`);
      core.info(`Branch: ${payload.pull_request.head.ref} → ${payload.pull_request.base.ref}`);
    }
    
    // Validation results
    const results = {
      branchName: null,
      readmeExistence: null,
      readmeTemplate: null,
      bdFolders: null,
      executionGroups: null,
      reviewersAndRoutes: null
    };
    
    // Job 1: Validate branch name
    core.startGroup('📋 Validación: Nombre de rama');
    try {
      results.branchName = await validateBranchName(payload);
      core.info('✅ Nombre de rama válido');
    } catch (error) {
      core.error(`❌ ${error.message}`);
      results.branchName = false;
    }
    core.endGroup();
    
    // Job 2: Validate README existence and template (grouped)
    if (!skipReadmeValidation) {
      core.startGroup('📄 Validación: README y Grupos de Ejecución');
      try {
        // Check README exists
        const readmeExists = await validateReadmeExistence();
        results.readmeExistence = readmeExists;
        core.info('✅ README.md encontrado');
        
        // Validate README template
        if (readmeExists) {
          results.readmeTemplate = await validateReadmeTemplate();
          core.info('✅ Plantilla README válida');
          
          // Validate execution groups
          if (configRepoToken) {
            results.executionGroups = await validateExecutionGroups(configRepoToken);
            core.info('✅ Grupos de ejecución coinciden');
          } else {
            core.warning('⚠️  Token de configuración no provisto, saltando validación de grupos de ejecución');
          }
        }
      } catch (error) {
        core.error(`❌ ${error.message}`);
        results.readmeTemplate = false;
      }
      core.endGroup();
    } else {
      core.info('⏭️  Validación de README omitida (skip-readme-validation=true)');
    }
    
    // Job 3: Repository reviews (grouped)
    core.startGroup('🔍 Revisiones: Repositorio');
    try {
      // Validate no BD folders
      results.bdFolders = await validateNoBDFolders();
      core.info('✅ No se encontraron carpetas BD');
      
      // Validate reviewers and routes
      if (payload.pull_request) {
        results.reviewersAndRoutes = await validateReviewersAndRoutes(payload, token);
        core.info('✅ Revisores y rutas válidos');
      }
    } catch (error) {
      core.error(`❌ ${error.message}`);
      results.bdFolders = false;
    }
    core.endGroup();
    
    // Summary
    core.startGroup('📊 Resumen de Validaciones');
    const allPassed = Object.values(results).every(r => r !== false);
    
    core.info('Resultados:');
    core.info(`  - Nombre de rama: ${results.branchName !== false ? '✅' : '❌'}`);
    if (!skipReadmeValidation) {
      core.info(`  - README existencia: ${results.readmeExistence !== false ? '✅' : '❌'}`);
      core.info(`  - README plantilla: ${results.readmeTemplate !== false ? '✅' : '❌'}`);
      core.info(`  - Grupos de ejecución: ${results.executionGroups !== false ? '✅' : '❌'}`);
    }
    core.info(`  - Carpetas BD: ${results.bdFolders !== false ? '✅' : '❌'}`);
    core.info(`  - Revisores y rutas: ${results.reviewersAndRoutes !== false ? '✅' : '❌'}`);
    
    if (allPassed) {
      core.info('🎉 Todas las validaciones pasaron exitosamente');
    } else {
      core.setFailed('❌ Una o más validaciones fallaron');
    }
    core.endGroup();
    
    // Set outputs
    core.setOutput('validation-passed', allPassed);
    core.setOutput('results', JSON.stringify(results));
    
  } catch (error) {
    core.setFailed(`Error en la ejecución: ${error.message}`);
    core.debug(error.stack);
  }
}

/**
 * Validate branch name follows GitFlow convention
 */
async function validateBranchName(payload) {
  if (!payload.pull_request) {
    return true; // Not a PR event
  }
  
  const branchName = payload.pull_request.head.ref;
  const pattern = /^(feature|bugfix|hotfix|release)\/[A-Za-z0-9._-]+$/;
  
  if (!pattern.test(branchName)) {
    throw new Error(`Nombre de rama inválido: '${branchName}'. Debe comenzar con 'feature/', 'bugfix/', 'hotfix/' o 'release/'`);
  }
  
  return true;
}

/**
 * Validate README.md exists
 */
async function validateReadmeExistence() {
  const readmePath = path.join(process.cwd(), 'README.md');
  
  if (!fs.existsSync(readmePath)) {
    throw new Error('No se encontró el archivo README.md en la raíz del repositorio');
  }
  
  return true;
}

/**
 * Validate README template (simplified version - delegates to bash script for complex validations)
 */
async function validateReadmeTemplate() {
  const readmePath = path.join(process.cwd(), 'README.md');
  const content = fs.readFileSync(readmePath, 'utf8');
  
  // Basic validations
  const requiredSections = [
    '# ESB_',
    '## INFORMACIÓN DEL SERVICIO',
    '## Procedimiento de despliegue',
    '## ACCESO AL SERVICIO',
    '## CANALES - APLICACIONES',
    '## DEPENDENCIAS',
    '## DOCUMENTACION',
    '## SQL'
  ];
  
  for (const section of requiredSections) {
    if (!content.includes(section)) {
      throw new Error(`Falta sección requerida: ${section}`);
    }
  }
  
  // Validate title is not just "ESB_"
  const titleMatch = content.match(/^# ESB_(.+)$/m);
  if (!titleMatch || !titleMatch[1] || titleMatch[1].trim() === '' || /^[_-]+\.?$/.test(titleMatch[1].trim())) {
    throw new Error('El título no puede ser solo "ESB_" o "ESB_" seguido solo de guiones');
  }
  
  // Check for boc200 URLs (should be boc201)
  if (content.includes('boc200')) {
    throw new Error('URLs con boc200 detectadas. Deben usar boc201');
  }
  
  return true;
}

/**
 * Validate no BD folders exist
 */
async function validateNoBDFolders() {
  const findBDFolders = (dir, results = []) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.name === '.git') continue; // Skip .git directory
      
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (entry.name.toLowerCase() === 'bd') {
          results.push(fullPath);
        }
        // Recursively search subdirectories
        findBDFolders(fullPath, results);
      }
    }
    
    return results;
  };
  
  const bdFolders = findBDFolders(process.cwd());
  
  if (bdFolders.length > 0) {
    throw new Error(`Se encontraron carpetas 'BD' en el repositorio:\n${bdFolders.join('\n')}`);
  }
  
  return true;
}

/**
 * Validate execution groups match central configuration
 */
async function validateExecutionGroups(token) {
  try {
    const readmePath = path.join(process.cwd(), 'README.md');
    const content = fs.readFileSync(readmePath, 'utf8');
    
    // Extract service name from README title
    const titleMatch = content.match(/^# ESB_ACE12_(.+)\.?$/m) || content.match(/^# ESB_(.+)\.?$/m);
    if (!titleMatch) {
      throw new Error('No se pudo extraer el nombre del servicio del README');
    }
    
    let serviceName = titleMatch[1].replace(/\.$/, '').trim();
    if (serviceName.startsWith('ACE12_')) {
      serviceName = serviceName.substring(6);
    }
    
    // Extract groups from README
    const deploymentMatch = content.match(/desplegar en los grupos de ejecución:\s*\n?([^\n#]+)/i);
    if (!deploymentMatch) {
      core.warning('No se encontró la frase "desplegar en los grupos de ejecución:" en el README');
      return true;
    }
    
    const readmeGroups = deploymentMatch[1]
      .split(/[\s,]+/)
      .filter(g => g.trim())
      .map(g => g.toLowerCase());
    
    // Download central configuration using @actions/github
    const octokit = github.getOctokit(token);
    let response;
    
    try {
      response = await octokit.rest.repos.getContent({
        owner: 'bocc-principal',
        repo: 'ESB_ACE12_General_Configs',
        path: 'ace-12-common-properties/esb-ace12-general-integration-servers.properties',
        ref: 'main'
      });
    } catch (error) {
      throw new Error('No se pudo descargar el archivo de configuración central');
    }
    
    // Decode base64 content
    const configContent = Buffer.from(response.data.content, 'base64').toString('utf8');
    
    // Extract groups from config
    const transactionalMatch = configContent.match(new RegExp(`ESB_ACE12_${serviceName}\\.Transactional=([^\n]+)`, 'i'));
    const notificationMatch = configContent.match(new RegExp(`ESB_ACE12_${serviceName}\\.Notification=([^\n]+)`, 'i'));
    
    if (!transactionalMatch && !notificationMatch) {
      throw new Error(`No existe entry ESB_ACE12_${serviceName}.Transactional ni ESB_ACE12_${serviceName}.Notification en el archivo de configuración`);
    }
    
    const configGroups = [
      ...(transactionalMatch ? transactionalMatch[1].split(',') : []),
      ...(notificationMatch ? notificationMatch[1].split(',') : [])
    ].map(g => g.trim().toLowerCase());
    
    // Compare groups
    const missingInConfig = readmeGroups.filter(g => !configGroups.includes(g));
    const missingInReadme = configGroups.filter(g => !readmeGroups.includes(g));
    
    if (missingInConfig.length > 0) {
      throw new Error(`Grupos en README que no están en config: ${missingInConfig.join(', ')}`);
    }
    
    if (missingInReadme.length > 0) {
      throw new Error(`Grupos en config que no están en README: ${missingInReadme.join(', ')}`);
    }
    
    return true;
  } catch (error) {
    // Add context to the error
    if (error.message.includes('No se pudo')) {
      throw error; // Already has context
    }
    throw new Error(`Error validando grupos de ejecución: ${error.message}`);
  }
}

/**
 * Validate reviewers and routes
 */
async function validateReviewersAndRoutes(payload, token) {
  const sourceBranch = payload.pull_request.head.ref;
  const targetBranch = payload.pull_request.base.ref;
  const prNumber = payload.pull_request.number;
  
  const validReviewers = ['DRamirezM', 'cdgomez', 'acardenasm', 'CAARIZA'];
  const requestedReviewers = (payload.pull_request.requested_reviewers || []).map(r => r.login);
  
  // Check if any valid reviewer is assigned
  const hasValidReviewer = requestedReviewers.some(r => validReviewers.includes(r));
  
  // Validate develop → quality
  if (targetBranch === 'quality' && sourceBranch === 'develop') {
    if (!hasValidReviewer) {
      throw new Error(`Falta revisor válido para calidad. Autorizados: ${validReviewers.join(', ')}`);
    }
  }
  
  // Validate quality → main
  if (targetBranch === 'main' && sourceBranch === 'quality') {
    if (!hasValidReviewer) {
      throw new Error(`Falta revisor válido para producción. Autorizados: ${validReviewers.join(', ')}`);
    }
  }
  
  // Check for emergency exception (feature/** → develop)
  if (targetBranch === 'develop' && sourceBranch.startsWith('feature/')) {
    if (!hasValidReviewer) {
      // Check for emergency approval comment using @actions/github
      try {
        const octokit = github.getOctokit(token);
        const { data: comments } = await octokit.rest.issues.listComments({
          owner: github.context.repo.owner,
          repo: github.context.repo.repo,
          issue_number: prNumber
        });
        
        const hasEmergencyApproval = comments.some(comment => 
          comment.body && comment.body.includes('@bot aprobar excepción')
        );
        
        if (hasEmergencyApproval) {
          core.warning('⚠️  Excepción de emergencia detectada en comentarios');
          return true;
        }
      } catch (error) {
        core.debug(`No se pudieron verificar comentarios del PR: ${error.message}`);
      }
    }
  }
  
  return true;
}

// Run the action
if (require.main === module) {
  run();
}

module.exports = { run };
