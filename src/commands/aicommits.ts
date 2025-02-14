import { execa } from 'execa';
import { spawn } from 'child_process';
import { black, dim, green, red, bgCyan } from 'kolorist';
import {
	intro,
	outro,
	spinner,
	select,
	confirm,
	isCancel,
} from '@clack/prompts';
import {
	assertGitRepo,
	getStagedDiff,
	getDetectedMessage,
} from '../utils/git.js';
import { getConfig } from '../utils/config.js';
import { generateCommitMessage } from '../utils/ollama.js';
import { KnownError, handleCliError } from '../utils/error.js';

export default async (
	generate: number | undefined,
	excludeFiles: string[],
	stageAll: boolean,
	commitType: string | undefined,
	rawArgv: string[],
) =>
	(async () => {
		// intro(bgCyan(black(' aicommits ')));
		await assertGitRepo();

		// const detectingFiles = spinner();

		if (stageAll) {
			// This should be equivalent behavior to `git commit --all`
			await execa('git', ['add', '--update']);
		}

		// detectingFiles.start('Detecting staged files');
		const staged = await getStagedDiff(excludeFiles);

		if (!staged) {
			// detectingFiles.stop('Detecting staged files');
			throw new KnownError(
				'No staged changes found. Stage your changes manually, or automatically stage all changes with the `--all` flag.',
			);
		}

		// detectingFiles.stop(
		// 	`${getDetectedMessage(staged.files)}:\n${staged.files
		// 		.map((file) => `     ${file}`)
		// 		.join('\n')}`,
		// );

		const { env } = process;
		const config = await getConfig({
			proxy:
				env.https_proxy || env.HTTPS_PROXY || env.http_proxy || env.HTTP_PROXY,
			generate: generate?.toString(),
			type: commitType?.toString(),
		});

		// const s = spinner();
		// s.start('The AI is analyzing your changes');
		let messages: string[];
		try {
			messages = await generateCommitMessage(
				// config.OPENAI_KEY,
				// config.model,
				config.locale,
				staged.diff,
				// config.generate,
				config['max-length'],
				config.type,
				// config.timeout,
				// config.proxy,
			);
		} finally {
			// s.stop('Changes analyzed');
		}

		if (messages.length === 0) {
			throw new KnownError('No commit messages were generated. Try again.');
		}

		const child = spawn(
			['git', 'commit', '-e', '-m', `"${messages[0]}"`, ...rawArgv].join(' '),
			[],
			{
				stdio: 'inherit',
				shell: true,
			},
		);
		child.on('close', () => {
			// outro(`${green('✔')} Successfully committed!`);
		});
	})().catch((error) => {
		outro(`${red('✖')} ${error.message}`);
		handleCliError(error);
		process.exit(1);
	});
