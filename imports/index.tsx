import svgPaths from "./svg-mkss7q2qdg";
import imgImage29 from "./241774bfbf1980588ad71c0aeec74d9820eda7a2.png";
import imgImage30 from "./0353e4bc27890122cb60ed7cc7bd494df7c8c443.png";
import imgGirl from "./4d9b625cda7db4795acbc669b3e24b6ce67fd700.png";
type ComponentProps = {
  className?: string;
  property1?: "Group 8";
};

function Component({ className, property1 = "Group 8" }: ComponentProps) {
  return (
    <div className={className || "h-[20px] relative w-[53px]"}>
      <div className="absolute bg-[#000a40] inset-0 rounded-[40px]">
        <div aria-hidden className="absolute border-2 border-solid border-white inset-[-2px] pointer-events-none rounded-[42px]" />
      </div>
      <div className="absolute bottom-1/4 left-[69.81%] right-[7.55%] top-[20%]">
        <svg className="absolute block inset-0 size-full" fill="none" height="11" preserveAspectRatio="none" viewBox="0 0 12 11" width="12">
          <path d={svgPaths.p288bb200} fill="white" id="Ellipse 5" stroke="white" />
        </svg>
      </div>
      <div className="absolute bottom-1/4 left-[58.49%] right-[16.98%] top-[15%]">
        <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 13 12" width="13">
          <ellipse cx="6.5" cy="6" fill="#000A40" id="Ellipse 6" rx="6.5" ry="6" />
        </svg>
      </div>
      <div className="absolute bottom-1/4 left-[30.19%] right-[47.17%] top-[15%]" data-name="Glare / 10" />
    </div>
  );
}

function Frame() {
  return (
    <div className="absolute h-[66.887px] left-[20px] top-[126px] w-[66.489px]">
      <p className="[word-break:break-word] absolute font-['Indie_Flower:Regular',sans-serif] h-[33.651px] leading-[normal] left-0 not-italic text-[13.026px] text-white top-0 w-[66.489px]">Hi I’m Mariyah</p>
      <div className="absolute flex inset-[58.64%_26.45%_0_17.06%] items-center justify-center" style={{ containerType: "size" }}>
        <div className="flex-none h-[hypot(-16.1109cqw,47.1662cqh)] rotate-[24.88deg] w-[hypot(83.8891cqw,52.8338cqh)]">
          <div className="relative size-full" data-name="Vector">
            <div className="absolute inset-[-4.72%_-1.95%]">
              <svg className="block size-full" fill="none" height="15.7407" preserveAspectRatio="none" viewBox="0 0 36.0941 15.7407" width="36.0941">
                <path d={svgPaths.pb623100} id="Vector" stroke="white" strokeLinecap="round" strokeMiterlimit="16" strokeWidth="1.35691" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStars() {
  return <div className="absolute bg-black inset-[2.16%_85.19%_94.34%_7.24%] mix-blend-color-dodge" data-name="Mini Stars / 4" />;
}

function MiniStars1() {
  return <div className="absolute bg-black inset-[2.92%_26.08%_93.59%_66.36%] mix-blend-color-dodge" data-name="Mini Stars / 5" />;
}

function Glare() {
  return <div className="absolute left-[214px] size-[46px] top-[80px]" data-name="Glare / 7" />;
}

function Glare1() {
  return <div className="absolute left-[121px] size-[46px] top-[27px]" data-name="Glare / 8" />;
}

function Glare2() {
  return <div className="absolute left-[353px] size-[46px] top-[80px]" data-name="Glare / 9" />;
}

export default function IPhone14Plus() {
  return (
    <div className="bg-white relative size-full" data-name="iPhone 14 Plus - 2">
      <div className="absolute h-[142px] left-0 top-[141px] w-[428px]" data-name="image 29">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage29} />
      </div>
      <div className="absolute h-[187px] left-[-257px] top-[-28px] w-[737px]" data-name="image 29">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img alt="" className="absolute h-[263.21%] left-0 max-w-none top-0 w-full" src={imgImage30} />
        </div>
      </div>
      <div className="absolute h-[126px] left-[46px] top-[159px] w-[159px]" data-name="Girl">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img alt="" className="absolute h-[168.27%] left-0 max-w-none top-[-68.26%] w-full" src={imgGirl} />
        </div>
      </div>
      <Frame />
      <MiniStars />
      <MiniStars1 />
      <Glare />
      <Glare1 />
      <Glare2 />
      <Component className="absolute h-[20px] left-[352px] top-[156px] w-[53px]" />
    </div>
  );
}