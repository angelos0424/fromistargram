import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { MultipartFile } from '@fastify/multipart';
import {
	createSharedMedia,
	listSharedMedia,
	getSharedMediaById
} from '../services/sharedMediaService.js';
import {
	validateFileType,
	saveUploadedFile,
	generateUniqueFilename
} from '../utils/fileUpload.js';

const listQuerySchema = z.object({
	cursor: z.string().optional(),
	limit: z.coerce.number().min(1).max(60).optional(),
	from: z.string().optional(),
	to: z.string().optional()
});

const idParamsSchema = z.object({
	id: z.string()
});

export async function registerSharedMediaRoutes(app: FastifyInstance): Promise<void> {
	const publicApiUrl = process.env.PUBLIC_API_BASE_URL || '';

	// POST /api/shared/upload - Upload media files
	app.post(
		'/api/shared/upload',
		{
			schema: {
				tags: ['Shared Media'],
				summary: 'Upload shared media files',
				consumes: ['multipart/form-data'],
				response: {
					200: {
						type: 'object',
						properties: {
							data: {
								type: 'array',
								items: {
									type: 'object',
									properties: {
										id: { type: 'string' },
										filename: { type: 'string' },
										originalName: { type: 'string' },
										mime: { type: 'string' },
										size: { type: 'number' },
										mediaUrl: { type: 'string' },
										caption: { type: 'string', nullable: true },
										uploadedAt: { type: 'string', format: 'date-time' }
									}
								}
							}
						}
					},
					400: {
						type: 'object',
						properties: {
							message: { type: 'string' }
						}
					}
				}
			}
		},
		async (request, reply) => {
			const parts = request.parts();
			const files: MultipartFile[] = [];
			let caption: string | undefined;

			try {
				for await (const part of parts) {
					if (part.type === 'file') {
						files.push(part as MultipartFile);
					} else if (part.type === 'field' && part.fieldname === 'caption') {
						caption = (part as any).value as string;
					}
				}

				if (files.length === 0) {
					return reply.code(400).send({ message: 'No files provided' });
				}

				const uploadedMedia = [];

				for (const file of files) {
					// Validate file
					const fileBuffer = await file.toBuffer();
					const validation = validateFileType(file.mimetype, fileBuffer.length);

					if (!validation.valid) {
						return reply.code(400).send({ message: validation.error });
					}

					// Generate unique filename
					const uniqueFilename = generateUniqueFilename(file.filename);

					// Save file
					const { size } = await saveUploadedFile(
						{
							...file,
							toBuffer: async () => fileBuffer
						} as MultipartFile,
						uniqueFilename
					);

					// Create database record
					const media = await createSharedMedia({
						filename: uniqueFilename,
						originalName: file.filename,
						mime: file.mimetype,
						size,
						caption: uploadedMedia.length === 0 ? caption : undefined // Only first file gets caption
					});

					// Construct media URL
					const date = new Date();
					const year = date.getFullYear();
					const month = String(date.getMonth() + 1).padStart(2, '0');
					const day = String(date.getDate()).padStart(2, '0');
					const yyyyMMdd = `${year}${month}${day}`;
					const mediaUrl = `${publicApiUrl}/api/media/uploaded/${yyyyMMdd}/${uniqueFilename}`;

					uploadedMedia.push({
						id: media.id,
						filename: media.filename,
						originalName: media.originalName,
						mime: media.mime,
						size: media.size,
						mediaUrl,
						caption: media.caption,
						uploadedAt: media.uploadedAt.toISOString()
					});
				}

				return { data: uploadedMedia };
			} catch (error) {
				app.log.error(error, 'Failed to upload files');
				return reply.code(500).send({ message: 'Failed to upload files' });
			}
		}
	);

	// GET /api/shared - List shared media
	app.get(
		'/api/shared',
		{
			schema: {
				tags: ['Shared Media'],
				summary: 'List shared media',
				querystring: {
					type: 'object',
					properties: {
						cursor: { type: 'string' },
						limit: { type: 'integer', minimum: 1, maximum: 60 },
						from: { type: 'string' },
						to: { type: 'string' }
					}
				},
				response: {
					200: {
						type: 'object',
						properties: {
							data: {
								type: 'array',
								items: {
									type: 'object',
									properties: {
										id: { type: 'string' },
										filename: { type: 'string' },
										originalName: { type: 'string' },
										mime: { type: 'string' },
										size: { type: 'number' },
										width: { type: 'number', nullable: true },
										height: { type: 'number', nullable: true },
										duration: { type: 'number', nullable: true },
										mediaUrl: { type: 'string' },
										caption: { type: 'string', nullable: true },
										uploadedAt: { type: 'string', format: 'date-time' }
									}
								}
							},
							hasMore: { type: 'boolean' },
							nextCursor: { type: 'string', nullable: true }
						}
					}
				}
			}
		},
		async (request) => {
			const params = listQuerySchema.parse(request.query);
			const result = await listSharedMedia(params);

			const data = result.data.map((media: any) => {
				const uploadDate = new Date(media.uploadedAt);
				const year = uploadDate.getFullYear();
				const month = String(uploadDate.getMonth() + 1).padStart(2, '0');
				const day = String(uploadDate.getDate()).padStart(2, '0');
				const yyyyMMdd = `${year}${month}${day}`;
				const mediaUrl = `${publicApiUrl}/api/media/uploaded/${yyyyMMdd}/${media.filename}`;

				return {
					id: media.id,
					filename: media.filename,
					originalName: media.originalName,
					mime: media.mime,
					size: media.size,
					width: media.width,
					height: media.height,
					duration: media.duration,
					mediaUrl,
					caption: media.caption,
					uploadedAt: media.uploadedAt.toISOString()
				};
			});

			return {
				data,
				hasMore: result.hasMore,
				nextCursor: result.nextCursor
			};
		}
	);

	// GET /api/shared/:id - Get shared media by ID
	app.get(
		'/api/shared/:id',
		{
			schema: {
				tags: ['Shared Media'],
				summary: 'Get shared media by ID',
				params: {
					type: 'object',
					properties: {
						id: { type: 'string' }
					},
					required: ['id']
				},
				response: {
					200: {
						type: 'object',
						properties: {
							data: {
								type: 'object',
								properties: {
									id: { type: 'string' },
									filename: { type: 'string' },
									originalName: { type: 'string' },
									mime: { type: 'string' },
									size: { type: 'number' },
									width: { type: 'number', nullable: true },
									height: { type: 'number', nullable: true },
									duration: { type: 'number', nullable: true },
									mediaUrl: { type: 'string' },
									caption: { type: 'string', nullable: true },
									uploadedAt: { type: 'string', format: 'date-time' }
								}
							}
						}
					},
					404: {
						type: 'object',
						properties: {
							message: { type: 'string' }
						}
					}
				}
			}
		},
		async (request, reply) => {
			const params = idParamsSchema.parse(request.params);
			const media = await getSharedMediaById(params.id);

			if (!media) {
				return reply.code(404).send({ message: 'Shared media not found' });
			}

			const uploadDate = new Date(media.uploadedAt);
			const year = uploadDate.getFullYear();
			const month = String(uploadDate.getMonth() + 1).padStart(2, '0');
			const day = String(uploadDate.getDate()).padStart(2, '0');
			const yyyyMMdd = `${year}${month}${day}`;
			const mediaUrl = `${publicApiUrl}/api/media/uploaded/${yyyyMMdd}/${media.filename}`;

			return {
				data: {
					id: media.id,
					filename: media.filename,
					originalName: media.originalName,
					mime: media.mime,
					size: media.size,
					width: media.width,
					height: media.height,
					duration: media.duration,
					mediaUrl,
					caption: media.caption,
					uploadedAt: media.uploadedAt.toISOString()
				}
			};
		}
	);
}
