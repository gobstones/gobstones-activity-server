import axios, { AxiosError } from 'axios';
import { Injectable } from '@nestjs/common';
import { EnvConfig } from './env-config.service';
import { mapObjIndexed, values } from 'ramda';

enum DiscordEmbedColor {
  GREEN = 5763719,
  RED = 15548997,
  YELLOW = 16705372,
}

type DiscordMessage = {
  embeds: DiscordEmbed[];
};

type DiscordEmbed = {
  color?: DiscordEmbedColor;
  title: string;
  description: string;
  fields: DiscordEmbedField[];
};

type DiscordEmbedField = {
  name: string;
  value: string;
  inline: boolean;
};

@Injectable()
export class DiscordLogger {
  webhookUrl: string;

  constructor(envConfig: EnvConfig) {
    const {
      discordWebhook: { id, token },
    } = envConfig;
    this.webhookUrl = `https://discord.com/api/webhooks/${id}/${token}`;
  }

  async warn(
    title: string,
    description: string,
    details: { [key: string]: any } = {},
  ) {
    await this.sendMessage(
      title,
      description,
      details,
      DiscordEmbedColor.YELLOW,
    );
  }

  async error(
    title: string,
    description: string,
    details: { [key: string]: any } = {},
  ) {
    await this.sendMessage(title, description, details, DiscordEmbedColor.RED);
  }

  async log(
    title: string,
    description: string,
    details: { [key: string]: any } = {},
  ) {
    await this.sendMessage(title, description, details);
  }

  private async sendMessage(
    title: string,
    description: string,
    details: { [key: string]: any },
    color?: DiscordEmbedColor,
  ): Promise<void> {
    try {
      await axios.post(
        this.webhookUrl,
        this.createRequest(title, description, details, color),
      );
    } catch (error) {
      if (!axios.isAxiosError(error)) {
        throw error;
      }

      const axError = error as AxiosError;
      throw new Error(`
        Falló la request a Discord... ¿habrás copiado mal las credenciales?
        Codigo: ${axError.response?.status}
        Error: ${axError.message}
      `);
    }
  }

  private createRequest(
    title: string,
    description: string,
    details: { [key: string]: any },
    color: DiscordEmbedColor,
  ): DiscordMessage {
    return {
      embeds: [
        {
          title,
          description,
          color: color,
          fields: values(
            mapObjIndexed(
              (value, name) => ({ name, value, inline: true }),
              details,
            ),
          ),
        },
      ],
    };
  }
}
