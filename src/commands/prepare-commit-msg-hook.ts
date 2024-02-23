import { intro, outro, spinner } from '@clack/prompts';
import { black, green, red, bgCyan } from 'kolorist';
import { getStagedDiff } from '../utils/git.js';
import { getConfig } from '../utils/config.js';
import { generateCommitMessage } from '../utils/ollama.js';
import { KnownError, handleCliError } from '../utils/error.js';
import prependFile from 'prepend-file';

const [messageFilePath, commitSource] = process.argv.slice(2);

export default () =>
	(async () => {
		if (!messageFilePath) {
			throw new KnownError(
				'Commit message file path is missing. This file should be called from the "prepare-commit-msg" git hook',
			);
		}

		// If a commit message is passed in, ignore
		if (commitSource) {
			return;
		}

		// All staged files can be ignored by our filter
		const staged = await getStagedDiff();
		if (!staged) {
			return;
		}

		intro(bgCyan(black(' aicommits ')));

		const { env } = process;
		const config = await getConfig({
			proxy:
				env.https_proxy || env.HTTPS_PROXY || env.http_proxy || env.HTTP_PROXY,
		});

		const s = spinner();
		s.start('The AI is analyzing your changes');
		let messages: string[];
		try {
			messages = await generateCommitMessage(
				// config.OPENAI_KEY,
				// config.model,
				config.locale,
				staged!.diff,
				// config.generate,
				config['max-length'],
				config.type,
				// config.timeout,
				// config.proxy,
			);
		} finally {
			s.stop('Changes analyzed');
		}

		await prependFile(messageFilePath, messages[0]);
		outro(`${green('✔')} Saved commit message!`);
	})().catch((error) => {
		outro(`${red('✖')} ${error.message}`);
		handleCliError(error);
		process.exit(1);
	});
