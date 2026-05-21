export interface Branding {
  channelName: string;
  subscribeText: string;
  ctaLine: string;
  handles: string[];
  showSubscribeButton: boolean;
  outroEnabled: boolean;
}

export const DEFAULT_BRANDING: Branding = {
  channelName: '',
  subscribeText: 'Subscribe ▸',
  ctaLine: '',
  handles: [],
  showSubscribeButton: true,
  outroEnabled: true,
};
