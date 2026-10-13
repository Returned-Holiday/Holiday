import alert from "../../assets/seal/seal-alert.png";
import appIcon from "../../assets/seal/seal-app-icon.png";
import done from "../../assets/seal/seal-done.png";
import laptop from "../../assets/seal/seal-laptop.png";
import magnifier from "../../assets/seal/seal-magnifier.png";
import nosignal from "../../assets/seal/seal-nosignal.png";
import peek from "../../assets/seal/seal-peek.png";
import shield from "../../assets/seal/seal-shield.png";
import sleep from "../../assets/seal/seal-sleep.png";
import warning from "../../assets/seal/seal-warning.png";

const SOURCES = {
  alert,
  appIcon,
  done,
  laptop,
  magnifier,
  nosignal,
  peek,
  shield,
  sleep,
  warning,
} as const;

export type IllustrationName = keyof typeof SOURCES;

type IllustrationProps = {
  name: IllustrationName;
  width: number;
  className?: string;
};

export function Illustration({ name, width, className }: IllustrationProps) {
  return (
    <img
      className={className}
      src={SOURCES[name]}
      width={width}
      alt=""
      aria-hidden="true"
      decoding="async"
    />
  );
}
