const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    core.info('Action ejecutada: placeholder en dist/index.js');
    const context = github.context;
    core.info(`Evento: ${context.eventName}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
