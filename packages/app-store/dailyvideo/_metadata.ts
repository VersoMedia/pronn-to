import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "Video",
  description: "",
  installed: false,
  type: "daily_video",
  variant: "",
  url: "https://daily.co",
  categories: [""],
  logo: "icon.svg",
  publisher: "Verso",
  category: "",
  slug: "daily-video",
  title: "Verso Video",
  isGlobal: true,
  email: "help@verso.ai",
  appData: {
    location: {
      linkType: "dynamic",
      type: "integrations:daily",
      label: "Video",
    },
  },
  key: { apikey: process.env.DAILY_API_KEY },
  dirName: "dailyvideo",
} as AppMeta;

export default metadata;
