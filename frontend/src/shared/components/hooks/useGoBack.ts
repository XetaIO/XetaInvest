import { useNavigate } from 'react-router';

const useGoBack = () => {
    const navigate = useNavigate();

    const goBack = () => {
        if (window.history.state && window.history.state.idx > 0) {
            void navigate(-1);
        } else {
            void navigate('/');
        }
    };

    return goBack;
};

export default useGoBack;
