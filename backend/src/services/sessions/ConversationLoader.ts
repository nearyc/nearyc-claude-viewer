import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
import readline from 'readline';
import type { ChatMessage, ConversationMessage, ContentBlock } from '../../types';
import { normalizePath, generateProjectSlug } from './PathUtils';

export interface ConversationLoaderDependencies {
  projectsDir: string;
}

/**
 * Loads full conversation from project jsonl file
 */
export class ConversationLoader {
  private projectsDir: string;

  constructor(deps: ConversationLoaderDependencies) {
    this.projectsDir = deps.projectsDir;
  }

  /**
   * Load full conversation from project jsonl file
   */
  async loadFullConversation(sessionId: string, projectPath: string): Promise<ChatMessage[]> {
    return this.loadConversationWithLimit(sessionId, projectPath, 0); // 0 means no limit
  }

  /**
   * Load conversation with limit (last N messages)
   * @param limit - Number of recent messages to load (0 = all messages)
   */
  async loadConversationWithLimit(
    sessionId: string,
    projectPath: string,
    limit: number = 0
  ): Promise<ChatMessage[]> {
    // If limit is specified and small, use efficient tail reading
    if (limit > 0 && limit <= 200) {
      return this.loadConversationTail(sessionId, projectPath, limit);
    }

    return this.loadConversationFull(sessionId, projectPath);
  }

  /**
   * Load full conversation (all messages)
   */
  private async loadConversationFull(sessionId: string, projectPath: string): Promise<ChatMessage[]> {
    const messages: ChatMessage[] = [];

    try {
      // Normalize path and generate project slug from path
      const normalizedPath = normalizePath(projectPath);
      const projectSlug = generateProjectSlug(normalizedPath);
      const conversationFile = path.join(this.projectsDir, projectSlug, `${sessionId}.jsonl`);

      // console.log(`[ConversationLoader] Loading conversation for ${sessionId}`);
      // console.log(`[ConversationLoader] Project path: ${normalizedPath} -> slug: ${projectSlug}`);
      // console.log(`[ConversationLoader] Looking for file: ${conversationFile}`);

      // Check if file exists
      try {
        await fs.access(conversationFile);
        // console.log(`[ConversationLoader] File found, parsing...`);
      } catch {
        // console.log(`[ConversationLoader] File not found: ${conversationFile}`);
        return messages;
      }

      // Read file line by line
      const fileStream = createReadStream(conversationFile, { encoding: 'utf-8' });
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      for await (const line of rl) {
        if (!line.trim()) continue;

        try {
          const entry: ConversationMessage = JSON.parse(line);

          // Only process user and assistant messages
          if (entry.type === 'user' || (entry.type === 'assistant' && entry.message)) {
            const role = entry.type === 'user' ? 'user' : 'assistant';
            const timestamp = new Date(entry.timestamp).getTime();

            if (entry.message?.content) {
              // Handle content as string or array
              if (typeof entry.message.content === 'string') {
                // Simple string content
                if (entry.message.content.trim()) {
                  messages.push({
                    uuid: entry.uuid,
                    role,
                    content: entry.message.content,
                    timestamp,
                    type: 'text',
                  });
                }
              } else if (Array.isArray(entry.message.content)) {
                // Array of content blocks
                for (const content of entry.message.content) {
                  if (content.type === 'text' && content.text) {
                    messages.push({
                      uuid: entry.uuid,
                      role,
                      content: content.text,
                      timestamp,
                      type: 'text',
                    });
                  } else if (content.type === 'thinking' && content.thinking) {
                    messages.push({
                      uuid: entry.uuid,
                      role,
                      content: content.thinking,
                      timestamp,
                      type: 'thinking',
                    });
                  }
                }
              }
            }
          }
        } catch (error) {
          // Skip invalid JSON lines
          continue;
        }
      }

      // Sort messages by timestamp
      messages.sort((a, b) => a.timestamp - b.timestamp);

      // console.log(`[ConversationLoader] Loaded ${messages.length} messages for ${sessionId}`);

      return messages;
    } catch (error) {
      console.error(`[ConversationLoader] Error loading conversation for ${sessionId}:`, error);
      return messages;
    }
  }

  /**
   * Load only the last N messages from the end of the file (efficient for large files)
   */
  private async loadConversationTail(
    sessionId: string,
    projectPath: string,
    limit: number
  ): Promise<ChatMessage[]> {
    const messages: ChatMessage[] = [];

    try {
      const normalizedPath = normalizePath(projectPath);
      const projectSlug = generateProjectSlug(normalizedPath);
      const conversationFile = path.join(this.projectsDir, projectSlug, `${sessionId}.jsonl`);

      // Check if file exists
      try {
        await fs.access(conversationFile);
      } catch {
        return messages;
      }

      // Get file stats to determine size
      const stats = await fs.stat(conversationFile);
      const fileSize = stats.size;

      // For files smaller than 1MB, just read normally and slice
      if (fileSize < 1024 * 1024) {
        const allMessages = await this.loadConversationFull(sessionId, projectPath);
        return allMessages.slice(-limit);
      }

      // For large files, read from end using buffer
      const chunkSize = 64 * 1024; // 64KB chunks
      const buffer = Buffer.alloc(chunkSize);
      const lines: string[] = [];

      // Open file for reading
      const fd = await fs.open(conversationFile, 'r');

      try {
        let position = fileSize;
        let leftover = '';

        // Read chunks from end until we have enough lines
        while (position > 0 && lines.length < limit * 2) { // *2 to account for non-message lines
          const readSize = Math.min(chunkSize, position);
          position -= readSize;

          const { bytesRead } = await fd.read(buffer, 0, readSize, position);
          const chunk = buffer.toString('utf-8', 0, bytesRead);

          // Combine with leftover from previous chunk
          const combined = chunk + leftover;
          const chunkLines = combined.split('\n');

          // Save first part as leftover (incomplete line)
          leftover = chunkLines.shift() || '';

          // Add remaining lines to our collection
          lines.unshift(...chunkLines.filter(line => line.trim()));
        }

        // Add any remaining leftover
        if (leftover.trim()) {
          lines.unshift(leftover);
        }
      } finally {
        await fd.close();
      }

      // Parse lines from end
      const lineCount = Math.min(lines.length, limit * 2);
      for (let i = lines.length - 1; i >= lines.length - lineCount && messages.length < limit; i--) {
        const line = lines[i];
        if (!line.trim()) continue;

        try {
          const entry: ConversationMessage = JSON.parse(line);

          if (entry.type === 'user' || (entry.type === 'assistant' && entry.message)) {
            const role = entry.type === 'user' ? 'user' : 'assistant';
            const timestamp = new Date(entry.timestamp).getTime();

            if (entry.message?.content) {
              if (typeof entry.message.content === 'string') {
                if (entry.message.content.trim()) {
                  messages.unshift({
                    uuid: entry.uuid,
                    role,
                    content: entry.message.content,
                    timestamp,
                    type: 'text',
                  });
                }
              } else if (Array.isArray(entry.message.content)) {
                for (const content of entry.message.content) {
                  if (content.type === 'text' && content.text) {
                    messages.unshift({
                      uuid: entry.uuid,
                      role,
                      content: content.text,
                      timestamp,
                      type: 'text',
                    });
                  } else if (content.type === 'thinking' && content.thinking) {
                    messages.unshift({
                      uuid: entry.uuid,
                      role,
                      content: content.thinking,
                      timestamp,
                      type: 'thinking',
                    });
                  }
                }
              }
            }
          }
        } catch {
          // Skip invalid JSON lines
          continue;
        }
      }

      // Ensure final sort by timestamp
      messages.sort((a, b) => a.timestamp - b.timestamp);

      console.log(`[ConversationLoader] Loaded last ${messages.length} messages (tail read) for ${sessionId}`);

      return messages;
    } catch (error) {
      console.error(`[ConversationLoader] Error loading conversation tail for ${sessionId}:`, error);
      // Fallback to full load
      const allMessages = await this.loadConversationFull(sessionId, projectPath);
      return allMessages.slice(-limit);
    }
  }
}
