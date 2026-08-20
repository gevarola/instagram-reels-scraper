export interface ApifyReel {
  videoUrl: string;
  url: string;
  videoPlayCount: number;
  likesCount: number;
  commentsCount: number;
  ownerUsername: string;
  images: string[];
  timestamp: string;
}

interface ApifyProfileResult {
  profilePicUrl: string;
  followersCount: number;
}

export interface CreatorStats {
  profilePicUrl: string;
  followers: number;
  reelsCount30d: number;
  avgViews30d: number;
}

function getToken(): string {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN not set");
  return token;
}

export interface DiscoveredProfile {
  username: string;
  fullName: string;
  biography: string;
  followers: number;
  profilePicUrl: string;
  businessCategory: string;
  language: string;
}

/** Step 1 of creator discovery: keyword search for accounts, e.g. "coffee shop".
 * Reuses the same apify/instagram-scraper actor already used elsewhere in this
 * file, just in its `search` input mode instead of `directUrls` — this is the
 * same lookup Instagram's own search bar does, so results are as noisy as
 * that search is. */
export async function searchProfiles(query: string, limit: number): Promise<DiscoveredProfile[]> {
  const token = getToken();

  const response = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        search: query,
        searchType: "profile",
        searchLimit: limit,
        resultsType: "details",
        resultsLimit: 1,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify search error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as Record<string, unknown>[];
  return data.map((p) => ({
    username: String(p.username ?? ""),
    fullName: String(p.fullName ?? ""),
    biography: String(p.biography ?? ""),
    followers: Number(p.followersCount ?? 0),
    profilePicUrl: String(p.profilePicUrl ?? ""),
    businessCategory: String(p.businessCategoryName ?? ""),
    language: "",
  }));
}

/** Step 2 of creator discovery: expand from one or more seed accounts into
 * Instagram's own "Suggested for You" graph, via the afanasenko
 * instagram-related-profiles-scraper actor (pay-per-profile, ~$0.01 each,
 * first 5 free). Its dataset rows use Title Case, spaced keys (confirmed via
 * a live test call) rather than the camelCase the main scraper actor uses —
 * do not assume they match. */
export async function findSimilarProfiles(
  seedUsernames: string[],
  opts: { minFollowers?: number; language?: string; limit?: number } = {}
): Promise<DiscoveredProfile[]> {
  const token = getToken();

  const response = await fetch(
    `https://api.apify.com/v2/acts/afanasenko~instagram-related-profiles-scraper/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUsernames: seedUsernames,
        searchDepth: "1",
        maxCountExpansion: opts.limit ?? 20,
        ...(opts.minFollowers ? { minFollowers: opts.minFollowers } : {}),
        profileLanguage: opts.language || "any",
        analyzeQuality: false,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify related-profiles error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as Record<string, string | number>[];
  return data
    .map((p) => {
      const account = String(p["Account"] ?? "");
      const username = account.replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "");
      return {
        username,
        fullName: String(p["Full Name"] ?? ""),
        biography: String(p["Biography"] ?? ""),
        followers: Number(p["Followers Count"] ?? 0),
        profilePicUrl: String(p["Profile Picture"] ?? ""),
        businessCategory: String(p["Category"] ?? "").replace(/^N\/A$/, ""),
        language: String(p["Detected Language"] ?? ""),
      };
    })
    .filter((p) => p.username);
}

export async function scrapeReels(
  username: string,
  maxVideos: number,
  nDays: number
): Promise<ApifyReel[]> {
  const token = getToken();

  const sinceDate = new Date(Date.now() - nDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const response = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addParentData: false,
        directUrls: [`https://www.instagram.com/${username}/`],
        enhanceUserSearchWithFacebookPage: false,
        isUserReelFeedURL: false,
        isUserTaggedFeedURL: false,
        onlyPostsNewerThan: sinceDate,
        resultsLimit: maxVideos,
        resultsType: "stories",
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data as ApifyReel[];
}

export async function scrapeCreatorStats(username: string): Promise<CreatorStats> {
  const token = getToken();

  // 1. Get profile info (details mode)
  const profileRes = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        directUrls: [`https://www.instagram.com/${username}/`],
        resultsType: "details",
        resultsLimit: 1,
      }),
    }
  );

  if (!profileRes.ok) {
    const text = await profileRes.text();
    throw new Error(`Apify profile error ${profileRes.status}: ${text}`);
  }

  const profileData = await profileRes.json() as ApifyProfileResult[];
  const profile = profileData[0] || {};
  const profilePicUrl = profile.profilePicUrl || "";
  const followers = profile.followersCount || 0;

  // 2. Get recent posts (last 30 days) to compute activity metrics
  const sinceDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const postsRes = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        directUrls: [`https://www.instagram.com/${username}/`],
        resultsType: "stories",
        resultsLimit: 100,
        onlyPostsNewerThan: sinceDate,
        addParentData: false,
      }),
    }
  );

  if (!postsRes.ok) {
    const text = await postsRes.text();
    throw new Error(`Apify posts error ${postsRes.status}: ${text}`);
  }

  const posts = await postsRes.json() as ApifyReel[];

  // Filter to only video posts within 30 days
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentReels = posts.filter(
    (p) => p.videoUrl && p.timestamp && new Date(p.timestamp) >= cutoff
  );

  const reelsCount30d = recentReels.length;
  const avgViews30d = reelsCount30d > 0
    ? Math.round(recentReels.reduce((sum, r) => sum + (r.videoPlayCount || 0), 0) / reelsCount30d)
    : 0;

  return { profilePicUrl, followers, reelsCount30d, avgViews30d };
}
