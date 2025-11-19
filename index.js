import core from '@actions/core';
import * as github from '@actions/github';
import fs from 'fs';
import path from 'path';

async function run() {
	try {
		const inputReadme = core.getInput('path-readme') || process.env.INPUT_PATH_README || 'README.md';
		const inputEventPath = core.getInput('github-event-path') || process.env.GITHUB_EVENT_PATH || process.env.INPUT_GITHUB_EVENT_PATH;
		const githubToken = core.getInput('github-token') || process.env.INPUT_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
		const orgToken = core.getInput('org-repo-token') || process.env.INPUT_ORG_REPO_TOKEN;

		core.info(`Inputs: path-readme=${inputReadme}, event-path=${inputEventPath ? '<provided>' : '<none>'}`);

		// Determinar payload PR: primero por archivo de evento si se proporcionó
		let eventPayload = null;
		if (inputEventPath && fs.existsSync(inputEventPath)) {
			try {
				const raw = fs.readFileSync(inputEventPath, 'utf8');
				eventPayload = JSON.parse(raw);
				core.info('Cargado payload desde github-event-path');
			} catch (e) {
				core.warning('No se pudo parsear github-event-path: ' + e.message);
			}
		}

		const context = github.context;
		const payload = eventPayload || context.payload || {};
		const pr = payload.pull_request || null;
		const headRef = pr ? pr.head.ref : (process.env.GITHUB_HEAD_REF || null);
		const baseRef = pr ? pr.base.ref : (process.env.GITHUB_BASE_REF || null);

		let failed = false;

		// 1) Validar nombre de rama
		if (headRef) {
			core.info(`Validando nombre de rama: ${headRef}`);
			const branchRegex = /^(feature|bugfix|hotfix|release)\/[A-Za-z0-9._-]+$/;
			if (!branchRegex.test(headRef)) {
				core.error("Nombre de rama inválido. Debe comenzar con 'feature/', 'bugfix/', 'hotfix/' o 'release/'.");
				failed = true;
			} else {
				core.notice('Nombre de rama válido.');
			}
		} else {
			core.warning('No se pudo determinar la rama origen (no es Pull Request o contexto limitado).');
		}

		// 2) Validar README.md (si existe) — si no existe es advertencia
		const readmePath = path.join(process.cwd(), inputReadme || 'README.md');
		if (!fs.existsSync(readmePath)) {
			core.warning('No se encontró README.md — advertencia: README ya no es obligatorio.');
		} else {
			core.info('README.md encontrado — validando plantilla mínima...');
			const content = fs.readFileSync(readmePath, 'utf8');
			if (!/^# ESB_/m.test(content)) {
				core.error("README.md: falta título principal que comience con '# ESB_'");
				failed = true;
			} else {
				core.notice('README.md: título principal OK');
			}
			['## INFORMACIÓN DEL SERVICIO', '## Procedimiento de despliegue', '## DOCUMENTACION', '## SQL'].forEach(h => {
				const re = new RegExp('^' + h.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'm');
				if (!re.test(content)) {
					core.error(`README.md: falta sección '${h}'`);
					failed = true;
				} else {
					core.notice(`README.md: sección '${h}' encontrada`);
				}
			});
		}

		// 3) Validar que no existan carpetas BD
		const walkSync = (dir, filelist = []) => {
			for (const file of fs.readdirSync(dir)) {
				const filepath = path.join(dir, file);
				// ignorar la carpeta .git y node_modules
				if (filepath.includes(`${path.sep}.git${path.sep}`) || filepath.endsWith(`${path.sep}.git`) || filepath.includes(`${path.sep}node_modules${path.sep}`)) continue;
				try {
					const stat = fs.statSync(filepath);
					if (stat.isDirectory()) {
						filelist.push(filepath);
						walkSync(filepath, filelist);
					}
				} catch (e) {
					// ignore
				}
			}
			return filelist;
		};

		const dirs = walkSync(process.cwd());
		const bdDirs = dirs.filter(d => path.basename(d).toLowerCase() === 'bd');
		if (bdDirs.length > 0) {
			core.error(`Se encontraron carpetas BD: ${bdDirs.join(', ')}`);
			failed = true;
		} else {
			core.notice('No se encontraron carpetas BD.');
		}

		// 4) Validar grupos de ejecución si existe token de org
		if (orgToken && fs.existsSync(readmePath)) {
			core.info('Intentando validar grupos de ejecución usando token org...');
			try {
				const octokit = github.getOctokit(orgToken);
				const owner = 'bocc-principal';
				const repo = 'ESB_ACE12_General_Configs';
				const filePath = 'ace-12-common-properties/esb-ace12-general-integration-servers.properties';
				const res = await octokit.repos.getContent({ owner, repo, path: filePath, ref: 'main' });
				let propsContent = '';
				if (res && res.data && res.data.content) {
					const buff = Buffer.from(res.data.content, 'base64');
					propsContent = buff.toString('utf8');
				}

				const readme = fs.readFileSync(readmePath, 'utf8');
				const despliegueMatch = /desplegar en los grupos de ejecuci[oó]n:\s*(.*)/i.exec(readme);
				let gruposReadme = '';
				if (despliegueMatch) gruposReadme = despliegueMatch[1].trim().toLowerCase();
				if (!gruposReadme) {
					core.error('No se pudieron extraer grupos de ejecución desde README');
					failed = true;
				} else {
					const servicioMatch = /#\s*ESB_.*$/m.exec(readme);
					let servicio = '';
					if (servicioMatch) {
						servicio = servicioMatch[0].replace(/^#\s*/,'').replace(/\.$/,'').replace(/^ESB_ACE12_/,'');
					}
					if (!servicio) {
						core.warning('No se pudo extraer nombre de servicio para validar properties');
					} else {
						const keyTrans = `ESB_ACE12_${servicio}.Transactional=`.toLowerCase();
						const keyNotif = `ESB_ACE12_${servicio}.Notification=`.toLowerCase();
						const lowerProps = propsContent.toLowerCase();
						const matchTrans = new RegExp(keyTrans + '([^\n\r]*)','i').exec(lowerProps);
						const matchNotif = new RegExp(keyNotif + '([^\n\r]*)','i').exec(lowerProps);
						const propsGroups = [(matchTrans && matchTrans[1]) || '', (matchNotif && matchNotif[1]) || ''].join(' ').trim();
						if (!propsGroups) {
							core.error('No existe entry .Transactional ni .Notification para el servicio en propiedades');
							failed = true;
						} else {
							const arrRead = gruposReadme.split(/[ ,]+/).filter(Boolean).map(s=>s.trim());
							const arrProps = propsGroups.split(/[ ,]+/).filter(Boolean).map(s=>s.trim());
							const missingInProps = arrRead.filter(r => !arrProps.includes(r));
							const missingInReadme = arrProps.filter(p => !arrRead.includes(p));
							if (missingInProps.length>0) { core.error(`Grupos en README que no están en config: ${missingInProps.join(', ')}`); failed=true; }
							if (missingInReadme.length>0) { core.error(`Grupos en config que no están en README: ${missingInReadme.join(', ')}`); failed=true; }
							if (!failed) core.notice('Grupos de ejecución coinciden entre README y config');
						}
					}
				}
			} catch (err) {
				core.error('Error descargando o parseando properties: ' + err.message);
				failed = true;
			}
		} else {
			core.info('No hay token org o README ausente — salto validación de grupos de ejecución.');
		}

		// 5) Validar revisores según ruta
		if (pr) {
			const reviewers = (pr.requested_reviewers || []).map(r=>r.login);
			const allowed = ['DRamirezM','cdgomez','acardenasm','CAARIZA'];
			if (baseRef === 'quality' && headRef === 'develop') {
				if (!reviewers.some(r=>allowed.includes(r))) {
					core.error('Falta revisor válido para develop → quality.');
					failed = true;
				}
			}
			if (baseRef === 'main' && headRef === 'quality') {
				if (!reviewers.some(r=>allowed.includes(r))) {
					core.error('Falta revisor válido para quality → main.');
					failed = true;
				}
			}
			if (baseRef === 'develop' && /^feature\//.test(headRef)) {
				try {
					if (githubToken) {
						const octokit = github.getOctokit(githubToken);
						const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');
						if (owner && repo) {
							const comments = await octokit.issues.listComments({ owner, repo, issue_number: pr.number });
							const bodies = comments.data.map(c=>c.body || '').join('\n');
							if (/@bot aprobar excepción/.test(bodies)) {
								core.notice('Se encontró comentario de excepción — permitiendo excepción.');
							}
						}
					}
				} catch (e) {
					core.warning('No fue posible comprobar comentarios para excepción: ' + e.message);
				}
			}
		}

		if (failed) {
			core.setFailed('Validaciones encontraron errores. Revisa los logs.');
		} else {
			core.info('Todas las validaciones pasaron o se consideraron advertencias.');
		}
	} catch (error) {
		core.setFailed(error.message);
	}
}

run();
