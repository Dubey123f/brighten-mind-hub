import { useEffect, useRef } from "react";

interface JitsiMeetingProps {
  roomName: string;
  displayName: string;
  onClose?: () => void;
  isHost?: boolean;
}

export default function JitsiMeeting({ roomName, displayName, onClose, isHost }: JitsiMeetingProps) {
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  useEffect(() => {
    if (!jitsiContainerRef.current) return;

    const loadJitsiScript = () => {
      return new Promise<void>((resolve, reject) => {
        if ((window as any).JitsiMeetExternalAPI) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = "https://meet.jit.si/external_api.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Jitsi script"));
        document.head.appendChild(script);
      });
    };

    const initJitsi = async () => {
      try {
        await loadJitsiScript();

        const domain = "meet.jit.si";
        const options = {
          roomName: `LovableLMS_${roomName}`,
          parentNode: jitsiContainerRef.current,
          width: "100%",
          height: "100%",
          userInfo: {
            displayName: displayName,
          },
          configOverwrite: {
            startWithAudioMuted: !isHost,
            startWithVideoMuted: !isHost,
            disableDeepLinking: true,
            prejoinPageEnabled: false,
            enableLobbyChat: false,
            hideLobbyButton: true,
            requireDisplayName: false,
            enableInsecureRoomNameWarning: false,
            toolbarButtons: [
              "microphone",
              "camera",
              "desktop",
              "fullscreen",
              "hangup",
              "chat",
              "raisehand",
              "participants-pane",
              "tileview",
              "settings",
              "filmstrip",
            ],
            lobby: {
              autoKnock: true,
              enableChat: false,
            },
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            TOOLBAR_BUTTONS: [],
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            MOBILE_APP_PROMO: false,
          },
        };

        apiRef.current = new (window as any).JitsiMeetExternalAPI(domain, options);

        apiRef.current.addListener("readyToClose", () => {
          onClose?.();
        });
      } catch (error) {
        console.error("Jitsi initialization error:", error);
      }
    };

    initJitsi();

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [roomName, displayName, isHost]);

  return (
    <div
      ref={jitsiContainerRef}
      className="w-full h-full rounded-xl overflow-hidden bg-black"
    />
  );
}
