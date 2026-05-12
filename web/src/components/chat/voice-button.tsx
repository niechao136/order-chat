'use client';

import { MicIcon } from 'lucide-react';
import { AnimatePresence, motion, useTransform } from 'framer-motion';

import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils';
import { useVoiceActivity } from '@/hooks/use-media';


interface VoiceButtonProp {
  onClick: () => Promise<void>
  isRecording: boolean
}


export function VoiceButton({ isRecording, onClick }: VoiceButtonProp) {

  const volumeValue = useVoiceActivity(isRecording);
  const scale = useTransform(volumeValue, [ 0, 1 ], [ 1, 2.5 ]);
  const opacity = useTransform(volumeValue, [ 0, 1 ], [ 0.4, 0.8 ]);
  const iconScale = useTransform(volumeValue, [ 0, 1 ], [ 1, 1.4 ]);

  return (
    <div className="relative flex items-center justify-center w-10 h-10">
      <AnimatePresence>
        {isRecording && (
          <motion.div
            style={{ scale, opacity }} // 直接绑定 MotionValue
            className="absolute inset-0 rounded-full bg-red-400/30 z-0"
          />
        )}
      </AnimatePresence>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          'relative z-10 h-9 w-9 rounded-xl transition-all duration-300',
          isRecording
            ? 'bg-red-500 text-white shadow-lg shadow-red-200 hover:bg-red-600'
            : 'text-slate-400 hover:bg-slate-100'
        )}
        onClick={() => onClick()}
      >
        <motion.div style={{ scale: isRecording ? iconScale : 1 }}>
          <MicIcon className="h-5 w-5"/>
        </motion.div>
      </Button>
    </div>
  );

}
