import { RoomStub } from '@/components/navigation/room-stub';

export default function GeminiRoomPage() {
  return (
    <RoomStub
      title="Gemini Room"
      description="Google AI workspace — long-context retrieval over the product catalogue, the WhatsApp transcript archive, and the Drive Room. Pairs with Omnia AI: where Omnia decides what to do, Gemini answers what is in the data."
      shortcuts={[
        { label: 'Omnia AI', href: '/omnia-ai', hint: 'The agentic partner. Routes tasks across the team.' },
        { label: 'Drive Room', href: '/drive-room', hint: 'Files Gemini will read from.' },
      ]}
    />
  );
}
