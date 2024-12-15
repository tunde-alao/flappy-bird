import { useEffect, useRef, useState } from "react";
import styles from "@/styles/FlappyBird.module.css";

const GRAVITY = 0.5;
const JUMP_FORCE = -8;
const PIPE_SPEED = 2;
const PIPE_SPAWN_INTERVAL = 2000;
const PIPE_GAP = 150;

interface Bird {
  y: number;
  velocity: number;
}

interface Pipe {
  x: number;
  height: number;
  id: number;
  passed?: boolean;
}

const FlappyBird = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [bird, setBird] = useState<Bird>({ y: 250, velocity: 0 });
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const gameLoopRef = useRef<number>();
  const lastPipeSpawnRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load images
  useEffect(() => {
    const birdImg = new Image();
    birdImg.src = "/flappy_bird/sprites/bluebird-midflap.png";
    const pipeImg = new Image();
    pipeImg.src = "/flappy_bird/sprites/pipe-green.png";
    const bgImg = new Image();
    bgImg.src = "/flappy_bird/sprites/background-day.png";
    const baseImg = new Image();
    baseImg.src = "/flappy_bird/sprites/base.png";
  }, []);

  const jump = () => {
    if (!gameStarted) {
      setGameStarted(true);
    }
    if (!gameOver) {
      setBird((prev) => ({ ...prev, velocity: JUMP_FORCE }));
    }
  };

  const spawnPipe = () => {
    const height = Math.random() * (300 - 100) + 100;
    setPipes((prev) => [
      ...prev,
      {
        x: 800,
        height,
        id: Date.now(),
      },
    ]);
  };

  const checkCollision = (birdY: number, pipes: Pipe[]) => {
    // Bird position (center point)
    const birdX = 100;
    const birdSize = 20; // Smaller collision box than visual size

    for (const pipe of pipes) {
      // Only check pipes that are near the bird
      if (pipe.x > 150 || pipe.x < 0) continue;

      // Check if bird is between pipes horizontally
      if (pipe.x < birdX + birdSize && pipe.x + 52 > birdX - birdSize) {
        // Check if bird hits top pipe
        if (birdY < pipe.height) {
          return true;
        }
        // Check if bird hits bottom pipe
        if (birdY > pipe.height + PIPE_GAP - birdSize) {
          return true;
        }
      }
    }
    return false;
  };

  const gameLoop = (timestamp: number) => {
    if (!gameStarted || gameOver) {
      return;
    }

    // Update bird position
    setBird((prev) => ({
      ...prev,
      y: prev.y + prev.velocity,
      velocity: prev.velocity + GRAVITY,
    }));

    // Check for collisions
    const hasCollision = checkCollision(bird.y, pipes);
    const isOutOfBounds = bird.y < 0 || bird.y > 576;

    if (hasCollision || isOutOfBounds) {
      console.log("Collision detected!", {
        hasCollision,
        isOutOfBounds,
        birdY: bird.y,
        pipes,
      });
      setGameOver(true);
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      return;
    }

    // Spawn new pipes
    if (timestamp - lastPipeSpawnRef.current >= PIPE_SPAWN_INTERVAL) {
      spawnPipe();
      lastPipeSpawnRef.current = timestamp;
    }

    // Update pipes position and check for score
    setPipes((prev) =>
      prev
        .map((pipe) => {
          const newX = pipe.x - PIPE_SPEED;
          if (!pipe.passed && newX + 26 < 100) {
            setScore((s) => s + 0.5);
            return { ...pipe, x: newX, passed: true };
          }
          return { ...pipe, x: newX };
        })
        .filter((pipe) => pipe.x > -60)
    );

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  };

  const resetGame = () => {
    console.log("Resetting game");
    setBird({ y: 250, velocity: 0 });
    setPipes([]);
    setScore(0);
    setGameOver(false);
    setGameStarted(false);
    lastPipeSpawnRef.current = 0;
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = undefined;
    }
  };

  useEffect(() => {
    if (gameStarted && !gameOver) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameStarted, gameOver]);

  const renderGame = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, 800, 600);

    // Draw background
    const bgImg = new Image();
    bgImg.src = "/flappy_bird/sprites/background-day.png";
    ctx.drawImage(bgImg, 0, 0, 800, 600);

    // Draw pipes
    const pipeImg = new Image();
    pipeImg.src = "/flappy_bird/sprites/pipe-green.png";
    pipes.forEach((pipe) => {
      // Draw top pipe
      ctx.save();
      ctx.translate(pipe.x + 26, pipe.height);
      ctx.rotate(Math.PI);
      ctx.drawImage(pipeImg, -26, 0, 52, 320);
      ctx.restore();

      // Draw bottom pipe
      ctx.drawImage(pipeImg, pipe.x, pipe.height + PIPE_GAP, 52, 320);
    });

    // Draw bird
    const birdImg = new Image();
    birdImg.src = "/flappy_bird/sprites/bluebird-midflap.png";
    ctx.drawImage(birdImg, 100, bird.y, 34, 24);

    // Draw score
    ctx.fillStyle = "white";
    ctx.font = "48px Arial";
    ctx.fillText(score.toString(), 400, 50);

    // Draw game over message
    if (gameOver) {
      const gameOverImg = new Image();
      gameOverImg.src = "/flappy_bird/sprites/gameover.png";
      ctx.drawImage(gameOverImg, 300, 200);
    }

    requestAnimationFrame(renderGame);
  };

  useEffect(() => {
    renderGame();
  }, [bird, pipes, gameOver, score]);

  return (
    <div
      className={styles.container}
      onClick={() => {
        if (gameOver) {
          resetGame();
        } else {
          jump();
        }
      }}
    >
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className={styles.canvas}
      />
      {!gameStarted && !gameOver && (
        <div className={styles.startMessage}>Click to Start</div>
      )}
    </div>
  );
};

export default FlappyBird;
