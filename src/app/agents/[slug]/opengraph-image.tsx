import { ImageResponse } from 'next/og';
import { getAgent } from '@/lib/data';

export const runtime = 'edge';
export const alt = 'AgentHub Agent';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { slug: string } }) {
  const agent = await getAgent(params.slug);
  if (!agent) {
    return new ImageResponse(
      (
        <div style={{
          width: '100%', height: '100%', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: '#09090b', color: '#a1a1aa',
          fontSize: 32,
        }}>
          Agent Not Found
        </div>
      ),
      { ...size }
    );
  }

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '60px',
        backgroundColor: '#09090b', color: '#f4f4f5',
        fontFamily: 'sans-serif',
      }}>
        {/* Top: AgentHub branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            fontSize: 24, fontWeight: 700, color: '#a78bfa',
          }}>
            AgentHub
          </div>
        </div>

        {/* Middle: Agent info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1, color: '#f4f4f5' }}>
            {agent.displayName}
          </div>
          <div style={{
            fontSize: 24, color: '#a1a1aa', lineHeight: 1.4,
            overflow: 'hidden', maxHeight: '100px',
          }}>
            {agent.description.length > 120 ? agent.description.slice(0, 120) + '...' : agent.description}
          </div>
        </div>

        {/* Bottom: Badges */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{
            padding: '8px 16px', borderRadius: '8px',
            backgroundColor: '#7c3aed33', color: '#c4b5fd',
            fontSize: 18, fontWeight: 600,
          }}>
            {agent.platform}
          </div>
          <div style={{
            padding: '8px 16px', borderRadius: '8px',
            backgroundColor: '#3b82f633', color: '#93c5fd',
            fontSize: 18, fontWeight: 600,
          }}>
            {agent.model}
          </div>
          <div style={{
            padding: '8px 16px', borderRadius: '8px',
            backgroundColor: '#27272a', color: '#a1a1aa',
            fontSize: 18, fontWeight: 600,
          }}>
            {agent.category}
          </div>
          {agent.stars > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px',
              backgroundColor: '#27272a', color: '#fbbf24',
              fontSize: 18, fontWeight: 600,
            }}>
              ★ {agent.stars.toLocaleString()}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
