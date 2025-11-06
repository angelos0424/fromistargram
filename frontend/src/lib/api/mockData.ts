import type { Account, Post } from './types';

const now = new Date();

const iso = (date: Date) => date.toISOString();

const daysAgo = (days: number) => {
  const d = new Date(now);
  d.setUTCDate(now.getUTCDate() - days);
  return iso(d);
};

export const mockAccounts: Account[] = [
  {
    id: 'starlight',
    username: 'starlight',
    displayName: 'Starlight',
    latestProfilePicUrl:
      'https://images.unsplash.com/photo-1521577352947-9bb58764b69a?w=128&h=128&fit=crop',
    profilePictures: [
      {
        id: 'starlight-pp-1',
        accountId: 'starlight',
        takenAt: daysAgo(2),
        url:
          'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=256&h=256&fit=crop'
      },
      {
        id: 'starlight-pp-2',
        accountId: 'starlight',
        takenAt: daysAgo(15),
        url:
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=256&h=256&fit=crop'
      }
    ]
  },
  {
    id: 'auroragram',
    username: 'auroragram',
    displayName: 'Aurora',
    latestProfilePicUrl:
      'https://images.unsplash.com/photo-1542293787938-4d2226c47e03?w=128&h=128&fit=crop',
    profilePictures: [
      {
        id: 'auroragram-pp-1',
        accountId: 'auroragram',
        takenAt: daysAgo(5),
        url:
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=256&h=256&fit=crop'
      },
      {
        id: 'auroragram-pp-2',
        accountId: 'auroragram',
        takenAt: daysAgo(30),
        url:
          'https://images.unsplash.com/photo-1589578527966-74ee9689171d?w=256&h=256&fit=crop'
      }
    ]
  }
];

export const mockPosts: Post[] = [
  {
    id: '2024-07-01_11-00-00_UTC',
    accountId: 'starlight',
    postedAt: daysAgo(1),
    caption:
      '새로운 콘셉트 촬영 중 ✨ #shooting #concept #starlight',
    hashtags: ['shooting', 'concept', 'starlight'],
    media: [
      {
        id: 'starlight-1-1',
        postId: '2024-07-01_11-00-00_UTC',
        order: 0,
        type: 'image',
        filename: '2024-07-01_11-00-00_UTC_1.jpg',
        mime: 'image/jpeg',
        width: 1080,
        height: 1350,
        thumbnailUrl:
          'https://images.unsplash.com/photo-1536329583941-14287ec6fc4e?w=400&h=400&fit=crop',
        mediaUrl:
          'https://images.unsplash.com/photo-1536329583941-14287ec6fc4e?w=1080&fit=crop'
      },
      {
        id: 'starlight-1-2',
        postId: '2024-07-01_11-00-00_UTC',
        order: 1,
        type: 'image',
        filename: '2024-07-01_11-00-00_UTC_2.jpg',
        mime: 'image/jpeg',
        width: 1080,
        height: 1080,
        thumbnailUrl:
          'https://images.unsplash.com/photo-1520854221050-0f4caff449fb?w=400&h=400&fit=crop',
        mediaUrl:
          'https://images.unsplash.com/photo-1520854221050-0f4caff449fb?w=1080&fit=crop'
      }
    ]
  },
  {
    id: '2024-06-20_08-12-43_UTC',
    accountId: 'starlight',
    postedAt: daysAgo(12),
    caption:
      '비 오는 날의 감성 ☔️ #rainyday #mood',
    hashtags: ['rainyday', 'mood'],
    media: [
      {
        id: 'starlight-2-1',
        postId: '2024-06-20_08-12-43_UTC',
        order: 0,
        type: 'image',
        filename: '2024-06-20_08-12-43_UTC_1.jpg',
        mime: 'image/jpeg',
        width: 1080,
        height: 1080,
        thumbnailUrl:
          'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=400&fit=crop',
        mediaUrl:
          'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1080&fit=crop'
      }
    ]
  },
  {
    id: '2024-07-02_09-30-44_UTC',
    accountId: 'auroragram',
    postedAt: daysAgo(0),
    caption:
      '아침 조깅으로 시작하는 하루! 🌅 #runner #morningroutine',
    hashtags: ['runner', 'morningroutine'],
    media: [
      {
        id: 'auroragram-1-1',
        postId: '2024-07-02_09-30-44_UTC',
        order: 0,
        type: 'image',
        filename: '2024-07-02_09-30-44_UTC_1.jpg',
        mime: 'image/jpeg',
        width: 1080,
        height: 1350,
        thumbnailUrl:
          'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&h=400&fit=crop',
        mediaUrl:
          'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1080&fit=crop'
      }
    ]
  },
  {
    id: '2024-06-10_17-02-05_UTC',
    accountId: 'auroragram',
    postedAt: daysAgo(25),
    caption:
      '새로운 댄스 커버 준비 중 💃 #dancecover #practice',
    hashtags: ['dancecover', 'practice'],
    media: [
      {
        id: 'auroragram-2-1',
        postId: '2024-06-10_17-02-05_UTC',
        order: 0,
        type: 'video',
        filename: '2024-06-10_17-02-05_UTC_1.mp4',
        mime: 'video/mp4',
        duration: 32,
        thumbnailUrl:
          'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop',
        mediaUrl:
          'https://videos.pexels.com/video-files/2776311/2776311-hd_1280_720_25fps.mp4'
      }
    ]
  }
];
