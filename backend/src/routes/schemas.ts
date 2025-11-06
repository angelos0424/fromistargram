export const AccountSummarySchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    latestProfilePicUrl: { type: ['string', 'null'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    lastIndexedAt: { type: ['string', 'null'], format: 'date-time' },
    postCount: { type: 'integer' }
  },
  required: ['id', 'createdAt', 'updatedAt', 'postCount'],
  additionalProperties: false
} as const;

export const MediaItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    orderIndex: { type: 'integer' },
    filename: { type: 'string' },
    mime: { type: 'string' },
    width: { type: ['integer', 'null'] },
    height: { type: ['integer', 'null'] },
    duration: { type: ['integer', 'null'] },
    type: { type: 'string', enum: ['image', 'video'] },
    mediaUrl: { type: 'string' },
    thumbnailUrl: { type: 'string' }
  },
  required: [
    'id',
    'orderIndex',
    'filename',
    'mime',
    'type',
    'mediaUrl',
    'thumbnailUrl'
  ],
  additionalProperties: false
} as const;

export const PostSummarySchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    accountId: { type: 'string' },
    caption: { type: ['string', 'null'] },
    postedAt: { type: 'string', format: 'date-time' },
    hasText: { type: 'boolean' },
    textContent: { type: ['string', 'null'] },
    media: {
      type: 'array',
      items: MediaItemSchema
    },
    tags: {
      type: 'array',
      items: { type: 'string' }
    }
  },
  required: ['id', 'accountId', 'postedAt', 'hasText', 'media', 'tags'],
  additionalProperties: false
} as const;

export const ListPostsResponseSchema = {
  type: 'object',
  properties: {
    data: {
      type: 'array',
      items: PostSummarySchema
    },
    pageInfo: {
      type: 'object',
      properties: {
        hasNextPage: { type: 'boolean' },
        nextCursor: { type: ['string', 'null'] }
      },
      required: ['hasNextPage', 'nextCursor'],
      additionalProperties: false
    }
  },
  required: ['data', 'pageInfo'],
  additionalProperties: false
} as const;
