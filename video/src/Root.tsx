import { Composition } from "remotion";
import { HWValidatorDemo } from "./HWValidatorDemo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HWValidatorDemo"
        component={HWValidatorDemo}
        durationInFrames={960}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
