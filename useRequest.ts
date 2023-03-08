import {
  useState,
  useEffect,
  useRef,
  SetStateAction,
  useCallback,
} from "react";
import lodash from "lodash";

interface UseRequestOptionsProps {
  /*
   * 手动开启
   */
  manual?: boolean;
  /*
   * 请求参数
   */
  initialData?: object;
  /*
   * 轮询
   */
  pollingInterval?: number | null;
  /*
   * 准备，用于依赖请求
   */
  ready?: boolean;
  /*
   * 防抖
   */
  debounceInterval?: number;
  /*
   * 节流
   */
  throttleInterval?: number;
  /*
   * 延迟loading为true的时间
   */
  loadingDelay?: number;
  /*
   * 依赖
   */
  refreshDeps?: any[];
  /*
   * 请求成功回调
   */
  onSuccess?: (res: any) => void;
}

const useRequest = (
  requestFn: (
    initialData?: object | string | []
  ) => Promise<SetStateAction<any>>,
  options: UseRequestOptionsProps
) => {
  const [data, setData] = useState<SetStateAction<any>>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const status = useRef<boolean>(false);
  const pollingIntervalTimer = useRef<NodeJS.Timer | null>(null);

  const {
    manual,
    initialData,
    pollingInterval,
    ready = true,
    debounceInterval,
    throttleInterval,
    loadingDelay,
    refreshDeps,
    onSuccess,
  } = options;

  useEffect(() => {
    if (loadingDelay) {
      setTimeout(() => {
        status && setLoading(true);
      }, loadingDelay);
    }
    setError(null);
    setData(null);
    // 手动触发request
    !manual && ready && request();
  }, [manual, ready, ...(Array.isArray(refreshDeps) ? refreshDeps : [])]);

  //  请求
  const request = () => {
    if (debounceInterval) {
      lodash.debounce(requestDoing, debounceInterval)();
    } else if (throttleInterval) {
      lodash.throttle(requestDoing, throttleInterval)();
    } else {
      requestDoing();
    }
  };

  // useRequest业务逻辑
  const requestDoing = async () => {
    try {
      !status.current && (status.current = true);
      if (pollingInterval && status.current) {
        pollingIntervalTimer.current = setTimeout(() => {
          status.current && request();
        }, pollingInterval);
      }
      const res = await requestFn(initialData);
      setData(res);
      // 请求成功响应回调
      onSuccess && onSuccess(res);
    } catch (err) {
      err && setError(JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  };

  // 取消
  const cancel = () => {
    if (pollingIntervalTimer.current) {
      clearTimeout(pollingIntervalTimer.current);
      pollingIntervalTimer.current = null;
      status.current && (status.current = false);
    }
  };

  // 缓存
  const cachedFetchData = useCallback(() => data, [data]);

  return { data, loading, error, request, cancel, cachedFetchData };
};

export default useRequest;
