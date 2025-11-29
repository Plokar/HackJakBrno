import RoomStatusGrid from './RoomStatusGrid';

export default function RealTimeDashboard({ data, onRoomClick }) {
  return (
    <div className="space-y-6">
      <RoomStatusGrid rooms={data} onRoomClick={onRoomClick} />
    </div>
  );
}
