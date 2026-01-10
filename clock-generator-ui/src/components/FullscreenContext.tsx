/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react';

const FullscreenContext = createContext<boolean>(false);

export const FullscreenProvider = FullscreenContext.Provider;

export function useFullscreen(): boolean {
    return useContext(FullscreenContext);
}
