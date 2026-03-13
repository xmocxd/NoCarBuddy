import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import axios from "axios";

function SignUpPage() {

    // initial form state, builds the form within component return based on this structure
    const initial = {
        email: { value: '', text: 'Email', type: 'text', validator: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+(\.[a-zA-Z]{2,})+$/, valid: true },
        firstName: { value: '', text: 'First Name', type: 'text', validator: /^[a-zA-Z\-. ]+$/, valid: true },
        lastName: { value: '', text: 'Last Name', type: 'text', validator: /^[a-zA-Z\-. ]+$/, valid: true },
        agreeTerms: { value: false, text: 'Agree to Terms and Conditions', type: 'checkbox', validator: true, valid: true }
    };

    const navigate = useNavigate();

    const [formState, setFormState] = useState(initial);
    const [formValid, setFormValid] = useState(true);

    function validateForm(state) {
        // validate form, will update state with validation flags which can be used to highlight invalid fields

        let formValid = true;
        let newState = { ...state };

        for (const field in state) {
            const fieldData = state[field];
            if (fieldData.validator instanceof RegExp && fieldData.validator.test(fieldData.value)) {
                newState = {
                    ...newState,
                    [field]: { ...newState[field], valid: true }
                };
            } else if (typeof fieldData.validator === 'boolean' && fieldData.value === fieldData.validator) {
                newState = {
                    ...newState,
                    [field]: { ...newState[field], valid: true }
                };
            } else {
                formValid = false;
                newState = {
                    ...newState,
                    [field]: { ...newState[field], valid: false }
                };
            }
        }
        return { formValid, newState };
    }

    function addUser(user) {
        // send POST request to add user
        axios.post('/api/users', {
            firstName: user.firstName.value,
            lastName: user.lastName.value,
            email: user.email.value,
            state: 'pending'
        }).then(response => {
            console.log('User added:', response.data);
            navigate('/confirmation', { state: { message: 'Thank you for signing up! Please check your email for confirmation and next steps.' } });
        }).catch(error => {
            console.error('Error adding user:', error);
        });
    }


    function updateField({ field, value }) {
        // update field value in state

        setFormState(state => ({
            ...state,
            [field]: { ...state[field], value: value }
        }));
    }

    function submit() {
        // validate form before submitting

        const { formValid, newState } = validateForm(formState);
        
        setFormValid(formValid);

        if (formValid) {
            addUser(newState);
            console.log('Form submitted:', newState);
            setFormState(initial); // clear form on submit
        } else {
            setFormState(newState); // update state with validation results
        }
    }

    return (
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pt-20 sm:pt-24">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-4 sm:p-6 lg:p-8 border border-slate-700">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-white">Sign Up</h1>
                <p className="text-base sm:text-xl md:text-2xl text-slate-300 font-light mb-6 sm:mb-8">
                    Sign up for an account below!
                </p>
                
                {!formValid && (
                    <div className="text-red-500 mb-4 text-sm sm:text-base">
                        Please correct the errors below and try again.
                    </div>
                )}

                <div className="text-sm sm:text-base lg:text-lg text-slate-300 mb-6 sm:mb-8">
                    <form className="space-y-4 sm:space-y-6">

                        {Object.entries(formState).map(([key, { value, text, type, valid }], index) => {
                            switch (type) {
                                case 'text':
                                case 'number':
                                case 'email':
                                    return (
                                        <div key={index}>
                                            <label className="block text-slate-300 mb-2 text-sm sm:text-base" htmlFor={key}>{text}</label>
                                            <input
                                                className={`w-full p-2.5 sm:p-3 rounded-lg bg-slate-700 border text-white focus:outline-none focus:border-blue-500 text-sm sm:text-base ${valid ? 'border-slate-600' : 'border-red-500'}`}
                                                type={type}
                                                name={key}
                                                value={value}
                                                onChange={(e) => updateField({ field: key, value: e.target.value })}
                                            />
                                        </div>
                                    );
                                case 'checkbox':
                                    return (
                                        <div key={index} className={`rounded-lg border p-2.5 sm:p-3 mt-8 sm:mt-12 mb-4 flex items-center space-x-2 ${valid ? 'border-slate-600' : 'border-red-500'}`}>
                                            <input
                                                type={type}
                                                checked={value}
                                                name={key}
                                                className="w-4 h-4 sm:w-5 sm:h-5"
                                                onChange={(e) => updateField({ field: key, value: e.target.checked })}
                                            />
                                            <label htmlFor={key} className="text-sm sm:text-base">{text}</label>
                                        </div>
                                    );
                                default:
                                    return;
                            }
                        })}

                        <div className="text-center">
                            <button onClick={(e) => {e.preventDefault(); submit();}} className="mt-5 w-full sm:w-auto rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 cursor-pointer py-3 px-6 sm:px-8 transition-all duration-200 font-semibold shadow-lg shadow-blue-600/50 hover:shadow-xl hover:shadow-blue-600/60 hover:scale-105 transform text-sm sm:text-base" type="submit">
                                Create Account
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default SignUpPage;