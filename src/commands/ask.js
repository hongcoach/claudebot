import { SlashCommandBuilder } from 'discord.js';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Discord message limit
const DISCORD_LIMIT = 2000;

function splitMessage(text) {
  const chunks = [];
  while (text.length > 0) {
    chunks.push(text.slice(0, DISCORD_LIMIT));
    text = text.slice(DISCORD_LIMIT);
  }
  return chunks;
}

export default {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Claude에게 질문합니다')
    .addStringOption(option =>
      option
        .setName('question')
        .setDescription('질문 내용')
        .setRequired(true)
    ),

  async execute(interaction) {
    const question = interaction.options.getString('question');

    await interaction.deferReply();

    try {
      let fullText = '';

      // Stream response and collect
      const stream = client.messages.stream({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: question }],
      });

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          fullText += event.delta.text;
        }
      }

      const chunks = splitMessage(fullText);

      // Edit the deferred reply with the first chunk
      await interaction.editReply(chunks[0]);

      // Send remaining chunks as follow-ups
      for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp(chunks[i]);
      }
    } catch (error) {
      console.error('Claude API error:', error);

      if (error instanceof Anthropic.AuthenticationError) {
        await interaction.editReply('❌ ANTHROPIC_API_KEY가 유효하지 않습니다.');
      } else if (error instanceof Anthropic.RateLimitError) {
        await interaction.editReply('❌ API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
      } else {
        await interaction.editReply('❌ Claude API 오류가 발생했습니다.');
      }
    }
  },
};
