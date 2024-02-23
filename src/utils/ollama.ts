import type { CommitType } from './config.js';
import ollama from 'ollama';
import { generatePrompt } from './prompt.js';

export async function generateCommitMessage(
	locale: string,
	diff: string,
	maxLength: number,
	type: CommitType,
) {
	const response = await ollama.chat({
		model: 'mistral',
		messages: [
			{ role: 'system', content: generatePrompt(locale, maxLength, type) },
			{ role: 'user', content: diff },
		],
	});
	return [response.message.content.trim()];
}
