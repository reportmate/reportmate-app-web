import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import DeviceCard from '@/components/DeviceCard'

// Mock device data
const mockDevice = {
  id: 'TEST001',
  name: 'Test MacBook Pro',
  serialNumber: 'TEST001',
  status: 'online',
  lastSeen: new Date('2025-01-01T12:00:00Z').toISOString(),
  operatingSystem: 'macOS 14.0',
  manufacturer: 'Apple',
  model: 'MacBook Pro',
  ipAddressV4: '192.168.1.100',
  location: 'Office A',
  totalMemoryGB: 16,
  updatedAt: new Date('2025-01-01T12:00:00Z').toISOString(),
}

describe('DeviceCard Component', () => {
  it('renders device information correctly', () => {
    render(<DeviceCard device={mockDevice} />)
    
    // Check device name
    expect(screen.getByText('Test MacBook Pro')).toBeInTheDocument()
    
    // Check device ID
    expect(screen.getByText('TEST001')).toBeInTheDocument()
    
    // Check device status
    const statusElement = screen.getByTestId('device-status')
    expect(statusElement).toHaveTextContent('online')
    expect(statusElement).toHaveClass('status-online')
    
    // Check device model
    expect(screen.getByText('MacBook Pro')).toBeInTheDocument()
    
    // Check IP address
    expect(screen.getByText('192.168.1.100')).toBeInTheDocument()
  })

  it('displays correct status styling for online device', () => {
    render(<DeviceCard device={mockDevice} />)
    
    const statusElement = screen.getByTestId('device-status')
    expect(statusElement).toHaveClass('status-online')
    expect(statusElement).toHaveStyle('color: #10b981')
  })

  it('displays correct status styling for offline device', () => {
    const offlineDevice = { ...mockDevice, status: 'offline' }
    render(<DeviceCard device={offlineDevice} />)
    
    const statusElement = screen.getByTestId('device-status')
    expect(statusElement).toHaveClass('status-offline')
    expect(statusElement).toHaveStyle('color: #ef4444')
  })

  it('handles click events correctly', () => {
    const mockOnClick = jest.fn()
    render(<DeviceCard device={mockDevice} onClick={mockOnClick} />)
    
    const cardElement = screen.getByTestId('device-card')
    fireEvent.click(cardElement)
    
    expect(mockOnClick).toHaveBeenCalledWith(mockDevice)
  })

  it('displays last seen time correctly', () => {
    render(<DeviceCard device={mockDevice} />)
    
    // Should display relative time
    expect(screen.getByText(/last seen/i)).toBeInTheDocument()
  })

  it('shows device specs when expanded', async () => {
    render(<DeviceCard device={mockDevice} expandable={true} />)
    
    // Click expand button
    const expandButton = screen.getByTestId('expand-button')
    fireEvent.click(expandButton)
    
    // Wait for specs to appear
    await waitFor(() => {
      expect(screen.getByText('16 GB')).toBeInTheDocument()
      expect(screen.getByText('macOS 14.0')).toBeInTheDocument()
    })
  })

  it('handles missing optional fields gracefully', () => {
    const minimalDevice = {
      id: 'MINIMAL001',
      name: 'Minimal Device',
      serialNumber: 'MINIMAL001',
      status: 'unknown',
      lastSeen: null,
      updatedAt: new Date().toISOString(),
    }
    
    render(<DeviceCard device={minimalDevice} />)
    
    expect(screen.getByText('Minimal Device')).toBeInTheDocument()
    expect(screen.getByText('MINIMAL001')).toBeInTheDocument()
    expect(screen.getByTestId('device-status')).toHaveTextContent('unknown')
  })

  it('applies custom className when provided', () => {
    render(<DeviceCard device={mockDevice} className="custom-class" />)
    
    const cardElement = screen.getByTestId('device-card')
    expect(cardElement).toHaveClass('custom-class')
  })

  it('renders loading state correctly', () => {
    render(<DeviceCard device={null} loading={true} />)
    
    expect(screen.getByTestId('device-card-skeleton')).toBeInTheDocument()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })
})
