import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/devices'
import { prisma } from '@/lib/prisma'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    device: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/devices', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/devices', () => {
    it('returns devices list successfully', async () => {
      const mockDevices = [
        {
          id: 'TEST001',
          name: 'Test Device 1',
          serialNumber: 'TEST001',
          status: 'online',
          lastSeen: new Date(),
          operatingSystem: 'macOS 14.0',
          manufacturer: 'Apple',
          model: 'MacBook Pro',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'TEST002',
          name: 'Test Device 2',
          serialNumber: 'TEST002',
          status: 'offline',
          lastSeen: new Date(Date.now() - 86400000), // 1 day ago
          operatingSystem: 'Windows 11',
          manufacturer: 'Dell',
          model: 'OptiPlex 7090',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockPrisma.device.findMany.mockResolvedValue(mockDevices)

      const { req, res } = createMocks({
        method: 'GET',
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data).toHaveProperty('devices')
      expect(data.devices).toHaveLength(2)
      expect(data.devices[0]).toMatchObject({
        id: 'TEST001',
        name: 'Test Device 1',
        status: 'online',
      })
    })

    it('handles database errors gracefully', async () => {
      mockPrisma.device.findMany.mockRejectedValue(new Error('Database connection failed'))

      const { req, res } = createMocks({
        method: 'GET',
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(500)
      const data = JSON.parse(res._getData())
      expect(data).toHaveProperty('error')
      expect(data.error).toBe('Internal server error')
    })

    it('filters devices by status when query parameter provided', async () => {
      const mockOnlineDevices = [
        {
          id: 'TEST001',
          name: 'Test Device 1',
          serialNumber: 'TEST001',
          status: 'online',
          lastSeen: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockPrisma.device.findMany.mockResolvedValue(mockOnlineDevices)

      const { req, res } = createMocks({
        method: 'GET',
        query: { status: 'online' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(mockPrisma.device.findMany).toHaveBeenCalledWith({
        where: { status: 'online' },
        orderBy: { lastSeen: 'desc' },
      })
    })
  })

  describe('POST /api/devices', () => {
    it('creates new device successfully', async () => {
      const newDevice = {
        id: 'NEW001',
        name: 'New Test Device',
        serialNumber: 'NEW001',
        status: 'online',
        operatingSystem: 'macOS 14.0',
        manufacturer: 'Apple',
        model: 'MacBook Air',
      }

      const createdDevice = {
        ...newDevice,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSeen: new Date(),
      }

      mockPrisma.device.create.mockResolvedValue(createdDevice)

      const { req, res } = createMocks({
        method: 'POST',
        body: newDevice,
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(201)
      const data = JSON.parse(res._getData())
      expect(data).toHaveProperty('device')
      expect(data.device).toMatchObject({
        id: 'NEW001',
        name: 'New Test Device',
      })
      expect(mockPrisma.device.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 'NEW001',
          name: 'New Test Device',
          serialNumber: 'NEW001',
        }),
      })
    })

    it('validates required fields', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          name: 'Missing ID Device',
          // Missing required 'id' field
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data).toHaveProperty('error')
      expect(data.error).toContain('required')
    })

    it('handles duplicate device creation', async () => {
      mockPrisma.device.create.mockRejectedValue(
        new Error('Unique constraint failed on the fields: (`id`)')
      )

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          id: 'DUPLICATE001',
          name: 'Duplicate Device',
          serialNumber: 'DUPLICATE001',
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(409)
      const data = JSON.parse(res._getData())
      expect(data).toHaveProperty('error')
      expect(data.error).toContain('already exists')
    })
  })

  describe('Unsupported methods', () => {
    it('returns 405 for unsupported methods', async () => {
      const { req, res } = createMocks({
        method: 'DELETE',
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(405)
      const data = JSON.parse(res._getData())
      expect(data).toHaveProperty('error')
      expect(data.error).toBe('Method not allowed')
    })
  })
})
