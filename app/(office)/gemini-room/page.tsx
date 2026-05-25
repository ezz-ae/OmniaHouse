import { RoomWorkspace } from '@/components/navigation/room-workspace';

export default function GeminiRoomPage() {
  return (
    <RoomWorkspace
      title="Gemini Room"
      description="Long-context research room for catalogue retrieval, WhatsApp transcript analysis, Drive source sets, and evidence-backed owner briefs."
      shortcuts={[
        { label: 'Omnia AI', href: '/omnia-ai', hint: 'Talk to Omnia AI and to each person\'s assistant.' },
        { label: 'Drive Room', href: '/drive-room', hint: 'Files Gemini will read from.' },
      ]}
    />
  );
}
