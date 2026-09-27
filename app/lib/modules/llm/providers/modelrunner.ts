import { BaseProvider, getOpenAILikeModel } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';

export default class ModelrunnerProvider extends BaseProvider {
  name = 'Modelrunner';
  getApiKeyLink = 'https://modelrunner.ai';

  config = {
    baseUrlKey: 'MODELRUNNER_API_BASE_URL',
    apiTokenKey: 'MODELRUNNER_API_KEY',
    baseUrl: 'https://modelrunner.ai/v1',
  };

  staticModels: ModelInfo[] = [
    {
      name: 'modelrunner-default',
      label: 'ModelRunner Default',
      provider: 'Modelrunner',
      maxTokenAllowed: 64000,
      maxCompletionTokens: 8192,
    },
  ];

  async getDynamicModels(
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv?: Record<string, string>,
  ): Promise<ModelInfo[]> {
    const { baseUrl, apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: 'MODELRUNNER_API_BASE_URL',
      defaultApiTokenKey: 'MODELRUNNER_API_KEY',
    });

    if (!baseUrl || !apiKey) {
      return [];
    }

    try {
      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        signal: this.createTimeoutSignal(5000),
      });

      if (!response.ok) {
        console.error(`ModelRunner API error: ${response.statusText}`);
        return [];
      }

      const data = (await response.json()) as any;
      const staticModelIds = this.staticModels.map((m) => m.name);

      const dynamicModels =
        data.data
          ?.filter((model: any) => !staticModelIds.includes(model.id))
          .map((m: any) => ({
            name: m.id,
            label: `${m.id} (Dynamic)`,
            provider: this.name,
            maxTokenAllowed: 64000,
            maxCompletionTokens: 8192,
          })) || [];

      return dynamicModels;
    } catch (error) {
      console.error(`Failed to fetch ModelRunner models:`, error);
      return [];
    }
  }

  getModelInstance(options: {
    model: string;
    serverEnv?: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    const { baseUrl, apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: this.convertEnvToRecord(serverEnv),
      defaultBaseUrlKey: 'MODELRUNNER_API_BASE_URL',
      defaultApiTokenKey: 'MODELRUNNER_API_KEY',
    });

    return getOpenAILikeModel(baseUrl || 'https://modelrunner.ai/v1', apiKey, model);
  }
}
