import { 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  ClockIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';
import classNames from 'classnames';

export default function AlertsPanel({ rooms = [] }) {
  const generateAlerts = () => {
    const alerts = [];

    rooms.forEach(room => {
      // Check for long-running operations
      if (room.status === 'active' && room.currentOperation) {
        const duration = calculateDuration(room.currentOperation.startTime);
        if (duration > 240) { // More than 4 hours
          alerts.push({
            id: `long-op-${room.id}`,
            type: 'warning',
            title: 'Dlouhá operace',
            message: `${room.name} - operace trvá již ${Math.floor(duration / 60)}h ${duration % 60}m`,
            room: room.name,
            timestamp: new Date()
          });
        }

        // Check if operation is exceeding estimated time
        if (room.currentOperation.estimatedEnd) {
          const remaining = new Date(room.currentOperation.estimatedEnd) - new Date();
          if (remaining < 0) {
            alerts.push({
              id: `exceeded-${room.id}`,
              type: 'error',
              title: 'Překročený čas',
              message: `${room.name} - operace přesáhla odhadovaný čas o ${Math.abs(Math.floor(remaining / 60000))} minut`,
              room: room.name,
              timestamp: new Date()
            });
          } else if (remaining < 900000) { // Less than 15 minutes remaining
            alerts.push({
              id: `ending-${room.id}`,
              type: 'info',
              title: 'Operace končí',
              message: `${room.name} - operace skončí za ${Math.floor(remaining / 60000)} minut`,
              room: room.name,
              timestamp: new Date()
            });
          }
        }
      }

      // Check for low utilization
      if (room.utilization < 50) {
        alerts.push({
          id: `low-util-${room.id}`,
          type: 'warning',
          title: 'Nízké využití',
          message: `${room.name} - využití pouze ${room.utilization}%`,
          room: room.name,
          timestamp: new Date()
        });
      }

      // Check for upcoming operations in available rooms
      if (room.status === 'available' && room.nextOperation) {
        const timeUntil = new Date(room.nextOperation.scheduledTime) - new Date();
        if (timeUntil > 0 && timeUntil < 1800000) { // Less than 30 minutes
          alerts.push({
            id: `upcoming-${room.id}`,
            type: 'info',
            title: 'Nadcházející operace',
            message: `${room.name} - operace začne za ${Math.floor(timeUntil / 60000)} minut`,
            room: room.name,
            timestamp: new Date()
          });
        }
      }
    });

    // Sort by priority: error > warning > info > success
    const priority = { error: 0, warning: 1, info: 2, success: 3 };
    return alerts.sort((a, b) => priority[a.type] - priority[b.type]);
  };

  const calculateDuration = (startTime) => {
    const start = new Date(startTime);
    const now = new Date();
    return Math.floor((now - start) / 60000); // Duration in minutes
  };

  const alerts = generateAlerts();

  const alertConfig = {
    error: {
      icon: ExclamationTriangleIcon,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      textColor: 'text-red-800'
    },
    warning: {
      icon: ExclamationTriangleIcon,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-600',
      textColor: 'text-yellow-800'
    },
    info: {
      icon: InformationCircleIcon,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-800'
    },
    success: {
      icon: CheckCircleIcon,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-600',
      textColor: 'text-green-800'
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Upozornění</h2>
        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
          {alerts.length}
        </span>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-3" />
            <p className="text-gray-500">Žádná upozornění</p>
            <p className="text-sm text-gray-400 mt-1">Vše funguje správně</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const config = alertConfig[alert.type];
            const Icon = config.icon;

            return (
              <div
                key={alert.id}
                className={classNames(
                  'border-l-4 p-4 rounded-r-lg transition-all hover:shadow-md',
                  config.bgColor,
                  config.borderColor
                )}
              >
                <div className="flex items-start">
                  <Icon className={classNames('h-5 w-5 mt-0.5 mr-3 flex-shrink-0', config.iconColor)} />
                  <div className="flex-1 min-w-0">
                    <h3 className={classNames('text-sm font-semibold mb-1', config.textColor)}>
                      {alert.title}
                    </h3>
                    <p className="text-sm text-gray-700">{alert.message}</p>
                    <div className="flex items-center mt-2 text-xs text-gray-500">
                      <ClockIcon className="h-3 w-3 mr-1" />
                      {alert.timestamp.toLocaleTimeString('cs-CZ', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
