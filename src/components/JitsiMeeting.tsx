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

    const JITSI_DOMAIN = "meet.ffmuc.net";

    const loadJitsiScript = () => {
      return new Promise<void>((resolve, reject) => {
        if ((window as any).JitsiMeetExternalAPI) {
          resolve();
          return;
        }

        const existingScript = document.querySelector('script[data-jitsi-external-api="true"]') as HTMLScriptElement | null;
        if (existingScript) {
          existingScript.addEventListener("load", () => resolve(), { once: true });
          existingScript.addEventListener("error", () => reject(new Error("Failed to load Jitsi script")), { once: true });
          return;
        }

        const script = document.createElement("script");
        script.src = `https://${JITSI_DOMAIN}/external_api.js`;
        script.async = true;
        script.dataset.jitsiExternalApi = "true";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Jitsi script"));
        document.head.appendChild(script);
      });
    };

    const initJitsi = async () => {
      try {
        await loadJitsiScript();

        const options = {
          roomName: `LovableLMS_${roomName}`,
          parentNode: jitsiContainerRef.current,
          width: "100%",
          height: "100%",
          userInfo: {
            displayName,
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

        apiRef.current = new (window as any).JitsiMeetExternalAPI(JITSI_DOMAIN, options);

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
  }, [roomName, displayName, isHost, onClose]);

  return <div ref={jitsiContainerRef} className="w-full h-full rounded-xl overflow-hidden bg-muted" />;
}
